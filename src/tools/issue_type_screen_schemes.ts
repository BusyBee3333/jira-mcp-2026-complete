// Issue Type Screen Schemes tools: list_issue_type_screen_schemes,
// create_issue_type_screen_scheme, update_issue_type_screen_scheme,
// delete_issue_type_screen_scheme, get_issue_type_screen_scheme_mappings,
// append_mappings_to_issue_type_screen_scheme, update_default_screen_scheme,
// remove_mappings_from_issue_type_screen_scheme, assign_issue_type_screen_scheme_to_project
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_issue_type_screen_schemes ────────────────────────────────────────
  server.registerTool(
    "list_issue_type_screen_schemes",
    {
      title: "List Issue Type Screen Schemes",
      description:
        "List all issue type screen schemes. Each scheme maps issue types to screen schemes for Create/View/Edit operations. Returns scheme ID, name, description.",
      inputSchema: {
        id: z.array(z.number().int()).optional().describe("Filter by specific scheme IDs"),
        queryString: z.string().optional().describe("Filter by name (partial match)"),
        orderBy: z
          .enum(["name", "-name", "+name"])
          .optional()
          .describe("Sort order"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 25)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.id) {
        for (const id of args.id as number[]) params.append("id", String(id));
      }
      if (args.queryString) params.set("queryString", args.queryString as string);
      if (args.orderBy) params.set("orderBy", args.orderBy as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 25));

      const result = await logger.time(
        "tool.list_issue_type_screen_schemes",
        () => client.get(`/rest/api/3/issuetypescreenscheme?${params}`),
        { tool: "list_issue_type_screen_schemes" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_issue_type_screen_scheme ───────────────────────────────────────
  server.registerTool(
    "create_issue_type_screen_scheme",
    {
      title: "Create Issue Type Screen Scheme",
      description:
        "Create a new issue type screen scheme. Define a default screen scheme and optionally map specific issue types to different screen schemes.",
      inputSchema: {
        name: z.string().describe("Issue type screen scheme name"),
        description: z.string().optional().describe("Description"),
        issueTypeMappings: z
          .array(
            z.object({
              issueTypeId: z
                .string()
                .describe("Issue type ID ('default' for the default mapping)"),
              screenSchemeId: z.string().describe("Screen scheme ID to map this issue type to"),
            })
          )
          .min(1)
          .describe("Mappings of issue types to screen schemes. Must include a 'default' mapping."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.create_issue_type_screen_scheme",
        () =>
          client.post("/rest/api/3/issuetypescreenscheme", {
            name: args.name,
            description: args.description,
            issueTypeMappings: args.issueTypeMappings,
          }),
        { tool: "create_issue_type_screen_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_issue_type_screen_scheme ───────────────────────────────────────
  server.registerTool(
    "update_issue_type_screen_scheme",
    {
      title: "Update Issue Type Screen Scheme",
      description: "Update the name and/or description of an issue type screen scheme.",
      inputSchema: {
        issueTypeScreenSchemeId: z.string().describe("Issue type screen scheme ID"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("New description"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;

      const result = await logger.time(
        "tool.update_issue_type_screen_scheme",
        () =>
          client.put(
            `/rest/api/3/issuetypescreenscheme/${args.issueTypeScreenSchemeId}`,
            body
          ),
        { tool: "update_issue_type_screen_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_issue_type_screen_scheme ───────────────────────────────────────
  server.registerTool(
    "delete_issue_type_screen_scheme",
    {
      title: "Delete Issue Type Screen Scheme",
      description:
        "Delete an issue type screen scheme. Cannot delete a scheme that is assigned to one or more projects.",
      inputSchema: {
        issueTypeScreenSchemeId: z.string().describe("Issue type screen scheme ID"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_issue_type_screen_scheme",
        () =>
          client.delete(
            `/rest/api/3/issuetypescreenscheme/${args.issueTypeScreenSchemeId}`
          ),
        { tool: "delete_issue_type_screen_scheme" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Issue type screen scheme ${args.issueTypeScreenSchemeId} deleted.`,
          },
        ],
      };
    }
  );

  // ── get_issue_type_screen_scheme_mappings ─────────────────────────────────
  server.registerTool(
    "get_issue_type_screen_scheme_mappings",
    {
      title: "Get Issue Type Screen Scheme Mappings",
      description:
        "Get the issue type to screen scheme mappings for one or more issue type screen schemes. Shows which screen scheme is used for each issue type.",
      inputSchema: {
        issueTypeScreenSchemeId: z
          .array(z.number().int())
          .min(1)
          .describe("Issue type screen scheme IDs"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      for (const id of args.issueTypeScreenSchemeId as number[]) {
        params.append("issueTypeScreenSchemeId", String(id));
      }
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.get_issue_type_screen_scheme_mappings",
        () =>
          client.get(`/rest/api/3/issuetypescreenscheme/mapping?${params}`),
        { tool: "get_issue_type_screen_scheme_mappings" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── append_mappings_to_issue_type_screen_scheme ───────────────────────────
  server.registerTool(
    "append_mappings_to_issue_type_screen_scheme",
    {
      title: "Append Mappings to Issue Type Screen Scheme",
      description:
        "Add new issue type to screen scheme mappings to an existing issue type screen scheme.",
      inputSchema: {
        issueTypeScreenSchemeId: z.string().describe("Issue type screen scheme ID"),
        issueTypeMappings: z
          .array(
            z.object({
              issueTypeId: z.string().describe("Issue type ID"),
              screenSchemeId: z.string().describe("Screen scheme ID"),
            })
          )
          .min(1)
          .describe("New mappings to append"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.append_mappings_to_issue_type_screen_scheme",
        () =>
          client.put(
            `/rest/api/3/issuetypescreenscheme/${args.issueTypeScreenSchemeId}/mapping`,
            { issueTypeMappings: args.issueTypeMappings }
          ),
        { tool: "append_mappings_to_issue_type_screen_scheme" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Mappings appended successfully.",
          },
        ],
      };
    }
  );

  // ── assign_issue_type_screen_scheme_to_project ────────────────────────────
  server.registerTool(
    "assign_screen_scheme_to_project",
    {
      title: "Assign Issue Type Screen Scheme to Project",
      description:
        "Assign an issue type screen scheme to a project. This determines which screens are shown for each issue type in Create/View/Edit operations.",
      inputSchema: {
        issueTypeScreenSchemeId: z
          .string()
          .optional()
          .describe("Issue type screen scheme ID to assign (omit to reset to default)"),
        projectId: z.string().describe("Project ID to assign the scheme to"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = { projectId: args.projectId };
      if (args.issueTypeScreenSchemeId)
        body.issueTypeScreenSchemeId = args.issueTypeScreenSchemeId;

      const result = await logger.time(
        "tool.assign_screen_scheme_to_project",
        () =>
          client.put("/rest/api/3/issuetypescreenscheme/project", body),
        { tool: "assign_screen_scheme_to_project" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Scheme assigned to project.",
          },
        ],
      };
    }
  );
}
