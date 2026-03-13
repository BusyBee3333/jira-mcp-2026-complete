// Screen Schemes tools: list_screen_schemes, get_screen_scheme, create_screen_scheme,
// update_screen_scheme, delete_screen_scheme, list_issue_type_screen_scheme_mappings
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_screen_schemes ───────────────────────────────────────────────────
  server.registerTool(
    "list_screen_schemes",
    {
      title: "List Screen Schemes",
      description:
        "List all screen schemes in the Jira instance. A screen scheme maps issue operations (Create, View, Edit) to screens. Returns scheme ID, name, description, and screen mappings.",
      inputSchema: {
        id: z
          .array(z.number().int())
          .optional()
          .describe("Filter by specific screen scheme IDs"),
        expand: z
          .string()
          .optional()
          .describe("Expand fields: 'issueTypeScreenSchemes' to include parent schemes"),
        queryString: z.string().optional().describe("Filter schemes by name (partial match)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 25)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.id) {
        for (const id of args.id as number[]) params.append("id", String(id));
      }
      if (args.expand) params.set("expand", args.expand as string);
      if (args.queryString) params.set("queryString", args.queryString as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 25));

      const result = await logger.time(
        "tool.list_screen_schemes",
        () => client.get(`/rest/api/3/screenscheme?${params}`),
        { tool: "list_screen_schemes" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_screen_scheme ──────────────────────────────────────────────────
  server.registerTool(
    "create_screen_scheme",
    {
      title: "Create Screen Scheme",
      description:
        "Create a new screen scheme. A screen scheme maps operations (create, view, edit) to specific screens. All three operations can use different screens.",
      inputSchema: {
        name: z.string().describe("Screen scheme name"),
        description: z.string().optional().describe("Screen scheme description"),
        screens: z
          .object({
            create: z.number().int().optional().describe("Screen ID for the Create operation"),
            view: z.number().int().optional().describe("Screen ID for the View operation"),
            edit: z.number().int().optional().describe("Screen ID for the Edit operation"),
            default: z.number().int().optional().describe("Default screen ID used when no specific screen is set"),
          })
          .describe("Screen mappings for each issue operation"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.create_screen_scheme",
        () =>
          client.post("/rest/api/3/screenscheme", {
            name: args.name,
            description: args.description,
            screens: args.screens,
          }),
        { tool: "create_screen_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_screen_scheme ──────────────────────────────────────────────────
  server.registerTool(
    "update_screen_scheme",
    {
      title: "Update Screen Scheme",
      description: "Update the name, description, or screen mappings of an existing screen scheme.",
      inputSchema: {
        screenSchemeId: z.string().describe("Screen scheme ID"),
        name: z.string().optional().describe("New name for the screen scheme"),
        description: z.string().optional().describe("New description"),
        screens: z
          .object({
            create: z.number().int().optional().describe("Screen ID for Create"),
            view: z.number().int().optional().describe("Screen ID for View"),
            edit: z.number().int().optional().describe("Screen ID for Edit"),
            default: z.number().int().optional().describe("Default screen ID"),
          })
          .optional()
          .describe("Updated screen mappings"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;
      if (args.screens) body.screens = args.screens;

      const result = await logger.time(
        "tool.update_screen_scheme",
        () =>
          client.put(`/rest/api/3/screenscheme/${args.screenSchemeId}`, body),
        { tool: "update_screen_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_screen_scheme ──────────────────────────────────────────────────
  server.registerTool(
    "delete_screen_scheme",
    {
      title: "Delete Screen Scheme",
      description:
        "Delete a screen scheme. The scheme cannot be deleted if it is used in an issue type screen scheme.",
      inputSchema: {
        screenSchemeId: z.string().describe("Screen scheme ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_screen_scheme",
        () => client.delete(`/rest/api/3/screenscheme/${args.screenSchemeId}`),
        { tool: "delete_screen_scheme" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Screen scheme ${args.screenSchemeId} deleted successfully.`,
          },
        ],
      };
    }
  );

  // ── list_screen_scheme_projects ───────────────────────────────────────────
  server.registerTool(
    "list_screen_scheme_projects",
    {
      title: "List Projects Using Screen Scheme",
      description:
        "List all projects that use a specific screen scheme via their issue type screen scheme. Helps understand the impact before modifying a screen scheme.",
      inputSchema: {
        screenSchemeId: z.number().int().describe("Screen scheme ID"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      params.set("screenSchemeId", String(args.screenSchemeId));

      const result = await logger.time(
        "tool.list_screen_scheme_projects",
        () =>
          client.get(
            `/rest/api/3/screenscheme/${args.screenSchemeId}/project?${params}`
          ),
        { tool: "list_screen_scheme_projects" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
