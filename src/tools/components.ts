// Components tools: list_components, create_component, update_component, delete_component
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_components ────────────────────────────────────────────────────────
  server.registerTool(
    "list_components",
    {
      title: "List Project Components",
      description:
        "List all components for a Jira project. Returns component ID, name, description, lead, and default assignee settings. Components are used to categorize issues within a project.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
        orderBy: z
          .enum(["description", "-description", "issueCount", "-issueCount", "lead", "-lead", "name", "-name"])
          .optional()
          .describe("Sort order (prefix '-' for descending)"),
        query: z.string().optional().describe("Filter components by name (partial match)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.orderBy) params.set("orderBy", args.orderBy as string);
      if (args.query) params.set("query", args.query as string);

      const result = await logger.time(
        "tool.list_components",
        () => client.get(`/project/${args.projectKeyOrId}/component?${params}`),
        { tool: "list_components", project: args.projectKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_component ───────────────────────────────────────────────────────
  server.registerTool(
    "create_component",
    {
      title: "Create Project Component",
      description:
        "Create a new component for a Jira project. Optionally assign a lead user and configure default assignee behavior. Returns the new component ID.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID"),
        name: z.string().describe("Component name"),
        description: z.string().optional().describe("Component description"),
        leadAccountId: z.string().optional().describe("Account ID of the component lead"),
        assigneeType: z
          .enum(["PROJECT_DEFAULT", "COMPONENT_LEAD", "PROJECT_LEAD", "UNASSIGNED"])
          .optional()
          .describe("Default assignee type for issues in this component"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        name: args.name,
        project: args.projectKeyOrId,
      };

      if (args.description) body.description = args.description;
      if (args.leadAccountId) body.leadAccountId = args.leadAccountId;
      if (args.assigneeType) body.assigneeType = args.assigneeType;

      const result = await logger.time(
        "tool.create_component",
        () => client.post("/component", body),
        { tool: "create_component", project: args.projectKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_component ───────────────────────────────────────────────────────
  server.registerTool(
    "update_component",
    {
      title: "Update Project Component",
      description:
        "Update an existing project component. Change the name, description, lead, or assignee type. Use list_components to find component IDs.",
      inputSchema: {
        componentId: z.string().describe("Component ID (from list_components)"),
        name: z.string().optional().describe("New component name"),
        description: z.string().optional().describe("New description"),
        leadAccountId: z.string().optional().describe("New lead account ID"),
        assigneeType: z
          .enum(["PROJECT_DEFAULT", "COMPONENT_LEAD", "PROJECT_LEAD", "UNASSIGNED"])
          .optional()
          .describe("New default assignee type"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;
      if (args.leadAccountId) body.leadAccountId = args.leadAccountId;
      if (args.assigneeType) body.assigneeType = args.assigneeType;

      const result = await logger.time(
        "tool.update_component",
        () => client.put(`/component/${args.componentId}`, body),
        { tool: "update_component", componentId: args.componentId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_component ───────────────────────────────────────────────────────
  server.registerTool(
    "delete_component",
    {
      title: "Delete Project Component",
      description:
        "Delete a project component. Optionally move issues assigned to this component to another component. Use list_components to find component IDs.",
      inputSchema: {
        componentId: z.string().describe("Component ID to delete (from list_components)"),
        moveIssuesToId: z
          .string()
          .optional()
          .describe("Component ID to move issues to (if not provided, issues are left without a component)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.moveIssuesToId) params.set("moveIssuesTo", args.moveIssuesToId as string);
      const qs = params.toString() ? `?${params}` : "";

      await logger.time(
        "tool.delete_component",
        () => client.delete(`/component/${args.componentId}${qs}`),
        { tool: "delete_component", componentId: args.componentId as string }
      );

      const result = { success: true, componentId: args.componentId };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
