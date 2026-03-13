// Statuses tools: list_statuses, get_status, list_status_categories
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_statuses ─────────────────────────────────────────────────────────
  server.registerTool(
    "list_statuses",
    {
      title: "List Jira Statuses",
      description:
        "List all issue statuses in the Jira instance, or filter by project. Returns status ID, name, description, category (To Do / In Progress / Done), and color. Use to discover valid statuses for JQL queries or transitions.",
      inputSchema: {
        projectIdOrKey: z.string().optional().describe("Optional project key or ID to get statuses for that project only"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const path = args.projectIdOrKey
        ? `/project/${args.projectIdOrKey}/statuses`
        : `/status`;

      const result = await logger.time(
        "tool.list_statuses",
        () => client.get(path),
        { tool: "list_statuses" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { statuses: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_status ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_status",
    {
      title: "Get Jira Status",
      description:
        "Get details of a specific Jira status by ID or name. Returns the status name, description, status category (To Do, In Progress, Done), and color.",
      inputSchema: {
        idOrName: z.string().describe("Status ID (numeric) or status name (e.g. 'In Progress', 'Done')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_status",
        () => client.get(`/status/${encodeURIComponent(args.idOrName as string)}`),
        { tool: "get_status", idOrName: args.idOrName as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_status_categories ────────────────────────────────────────────────
  server.registerTool(
    "list_status_categories",
    {
      title: "List Jira Status Categories",
      description:
        "List all status categories in Jira. Status categories group statuses into high-level workflow stages: To Do, In Progress, and Done. Returns category ID, key, name, and color.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.list_status_categories",
        () => client.get("/statuscategory"),
        { tool: "list_status_categories" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { statusCategories: result } as Record<string, unknown>,
      };
    }
  );
}
