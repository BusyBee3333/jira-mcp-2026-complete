// Projects tools: list_projects, get_project, get_project_statuses, list_project_roles, create_project
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_projects ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_projects",
    {
      title: "List Jira Projects",
      description:
        "List all accessible Jira projects with key, name, type, and lead. Supports offset pagination (startAt, maxResults). Use when browsing available projects or finding a project key before querying issues.",
      inputSchema: {
        startAt: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Offset for pagination (default 0)"),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max results to return (default 50, max 100)"),
        query: z.string().optional().describe("Filter projects by name or key"),
        orderBy: z
          .enum(["category", "key", "name", "owner"])
          .optional()
          .describe("Sort field"),
        expand: z
          .string()
          .optional()
          .describe("Comma-separated expand fields (e.g. description,lead,url)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.startAt !== undefined) params.set("startAt", String(args.startAt));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.query) params.set("query", args.query);
      if (args.orderBy) params.set("orderBy", args.orderBy);
      if (args.expand) params.set("expand", args.expand);

      const result = await logger.time(
        "tool.list_projects",
        () => client.get(`/project/search?${params}`),
        { tool: "list_projects" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_project ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_project",
    {
      title: "Get Jira Project",
      description:
        "Get full details for a Jira project by key (e.g. 'PROJ') or ID. Returns name, description, lead, components, versions, and issue types. Use when you need project metadata before creating issues or exploring project structure.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID"),
        expand: z
          .string()
          .optional()
          .describe("Comma-separated expand fields (e.g. description,lead,issueTypes,versions)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.get_project",
        () => client.get(`/project/${args.projectKeyOrId}${qs}`),
        { tool: "get_project", project: args.projectKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_project_statuses ───────────────────────────────────────────────────
  server.registerTool(
    "get_project_statuses",
    {
      title: "Get Project Statuses",
      description:
        "Get all issue statuses available for each issue type in a project. Returns the issue type name and its associated statuses (name, ID, category). Useful for understanding the workflow before using transition_issue.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_project_statuses",
        () => client.get(`/project/${args.projectKeyOrId}/statuses`),
        { tool: "get_project_statuses", project: args.projectKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { statuses: result } as Record<string, unknown>,
      };
    }
  );

  // ── list_project_roles ─────────────────────────────────────────────────────
  server.registerTool(
    "list_project_roles",
    {
      title: "List Project Roles",
      description:
        "List all roles defined for a Jira project along with their actor (member) details. Returns role name, ID, description, and the users/groups assigned to each role.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      // First get the roles list (name → URL map)
      const rolesMap = await logger.time(
        "tool.list_project_roles",
        () => client.get<Record<string, string>>(`/project/${args.projectKeyOrId}/role`),
        { tool: "list_project_roles", project: args.projectKeyOrId as string }
      );

      // Fetch details for each role in parallel
      const roleDetails = await Promise.all(
        Object.entries(rolesMap).map(async ([roleName, roleUrl]) => {
          // Extract role ID from the URL
          const roleId = roleUrl.split("/").pop();
          try {
            const detail = await client.get(`/project/${args.projectKeyOrId}/role/${roleId}`);
            return detail;
          } catch {
            return { name: roleName, id: roleId, error: "Could not fetch details" };
          }
        })
      );

      const result = {
        projectKey: args.projectKeyOrId,
        total: roleDetails.length,
        roles: roleDetails,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_project ─────────────────────────────────────────────────────────
  server.registerTool(
    "create_project",
    {
      title: "Create Jira Project",
      description:
        "Create a new Jira project. Requires project key, name, and project type. The lead account ID is required. Optionally set project template, description, and assignee type.",
      inputSchema: {
        key: z
          .string()
          .min(2)
          .max(10)
          .regex(/^[A-Z][A-Z0-9]+$/)
          .describe("Project key (2-10 uppercase letters/numbers, must start with a letter, e.g. 'MYPROJ')"),
        name: z.string().describe("Project name (displayed in Jira)"),
        leadAccountId: z.string().describe("Account ID of the project lead"),
        projectTypeKey: z
          .enum(["software", "service_desk", "business"])
          .optional()
          .describe("Project type (default: software)"),
        description: z.string().optional().describe("Project description"),
        assigneeType: z
          .enum(["PROJECT_LEAD", "UNASSIGNED"])
          .optional()
          .describe("Default assignee type (default: UNASSIGNED)"),
        projectTemplateKey: z
          .string()
          .optional()
          .describe(
            "Project template key (e.g. 'com.pyxis.greenhopper.jira:gh-scrum-template' for Scrum, 'com.pyxis.greenhopper.jira:gh-kanban-template' for Kanban)"
          ),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        key: args.key,
        name: args.name,
        leadAccountId: args.leadAccountId,
        projectTypeKey: args.projectTypeKey ?? "software",
        assigneeType: args.assigneeType ?? "UNASSIGNED",
      };

      if (args.description) body.description = args.description;
      if (args.projectTemplateKey) body.projectTemplateKey = args.projectTemplateKey;

      const result = await logger.time(
        "tool.create_project",
        () => client.post("/project", body),
        { tool: "create_project", key: args.key as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_project ─────────────────────────────────────────────────────────
  server.registerTool(
    "update_project",
    {
      title: "Update Jira Project",
      description:
        "Update an existing Jira project's settings. Supports updating name, description, lead, URL, assignee type, and project category. Returns the updated project details.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID to update"),
        name: z.string().optional().describe("New project name"),
        description: z.string().optional().describe("New project description"),
        leadAccountId: z.string().optional().describe("Account ID of the new project lead"),
        url: z.string().optional().describe("New project URL"),
        assigneeType: z.enum(["PROJECT_LEAD", "UNASSIGNED"]).optional().describe("Default assignee type"),
        avatarId: z.number().int().optional().describe("ID of the new project avatar"),
        categoryId: z.number().int().optional().describe("ID of the project category"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;
      if (args.leadAccountId) body.leadAccountId = args.leadAccountId;
      if (args.url) body.url = args.url;
      if (args.assigneeType) body.assigneeType = args.assigneeType;
      if (args.avatarId !== undefined) body.avatarId = args.avatarId;
      if (args.categoryId !== undefined) body.categoryId = args.categoryId;

      const result = await logger.time(
        "tool.update_project",
        () => client.put(`/project/${args.projectKeyOrId}`, body),
        { tool: "update_project", project: args.projectKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_project ─────────────────────────────────────────────────────────
  server.registerTool(
    "delete_project",
    {
      title: "Delete Jira Project",
      description:
        "Permanently delete a Jira project and all its issues. This action cannot be undone. Requires project admin permissions. To move a project to trash instead, use archive_project.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID to delete"),
        enableUndo: z.boolean().optional().describe("Move to project trash instead of permanent delete (default false). If true, project can be restored from Jira admin."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.enableUndo) params.set("enableUndo", "true");
      const qs = params.toString() ? `?${params}` : "";

      await logger.time(
        "tool.delete_project",
        () => client.delete(`/project/${args.projectKeyOrId}${qs}`),
        { tool: "delete_project", project: args.projectKeyOrId as string }
      );

      const result = { success: true, projectKey: args.projectKeyOrId };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_project_components ────────────────────────────────────────────────
  server.registerTool(
    "get_project_components",
    {
      title: "Get Project Components",
      description:
        "Get all components defined for a Jira project. Returns each component's ID, name, description, lead, assignee type, and default assignee. Components are used to categorize issues within a project.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID"),
        componentSource: z.enum(["jira", "compass", "auto"]).optional().describe("Filter by component source"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.componentSource) params.set("componentSource", args.componentSource as string);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.get_project_components",
        () => client.get(`/project/${args.projectKeyOrId}/components${qs}`),
        { tool: "get_project_components", project: args.projectKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { components: result } as Record<string, unknown>,
      };
    }
  );

  // ── archive_project ────────────────────────────────────────────────────────
  server.registerTool(
    "archive_project",
    {
      title: "Archive Jira Project",
      description:
        "Archive a Jira project. Archived projects are hidden from most views and search results but are not deleted. Issues in archived projects can still be searched via JQL. Requires project admin or site admin permissions.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID to archive"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      await logger.time(
        "tool.archive_project",
        () => client.post(`/project/${args.projectKeyOrId}/archive`, {}),
        { tool: "archive_project", project: args.projectKeyOrId as string }
      );

      const result = { success: true, projectKey: args.projectKeyOrId, archived: true };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_recent_projects ───────────────────────────────────────────────────
  server.registerTool(
    "list_recent_projects",
    {
      title: "List Recent Jira Projects",
      description:
        "Get a list of projects recently viewed or accessed by the current user. Returns up to 20 projects ordered by last access time. Useful for quick project discovery without needing to know project keys.",
      inputSchema: {
        expand: z.string().optional().describe("Comma-separated expand fields (e.g. description,lead,url,projectKeys)"),
        properties: z.array(z.string()).optional().describe("Project properties to include in the response"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);
      if (args.properties) (args.properties as string[]).forEach((p) => params.append("properties", p));
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.list_recent_projects",
        () => client.get(`/project/recent${qs}`),
        { tool: "list_recent_projects" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { projects: result } as Record<string, unknown>,
      };
    }
  );
}
