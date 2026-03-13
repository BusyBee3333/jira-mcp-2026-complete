// Issue Navigator / Column Configuration tools:
// get_issue_navigator_columns, set_issue_navigator_columns, reset_issue_navigator_columns
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_issue_navigator_columns ───────────────────────────────────────────
  server.registerTool(
    "get_issue_navigator_columns",
    {
      title: "Get Issue Navigator Default Columns",
      description:
        "Retrieve the default column configuration for the Jira issue navigator. Returns the list of columns (fields) displayed by default in the list view. These are the system defaults that users see before customising their own view.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.get_issue_navigator_columns",
        () => client.get("/rest/api/3/settings/columns"),
        { tool: "get_issue_navigator_columns" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── set_issue_navigator_columns ───────────────────────────────────────────
  server.registerTool(
    "set_issue_navigator_columns",
    {
      title: "Set Issue Navigator Default Columns",
      description:
        "Set the default column configuration for the Jira issue navigator. Provide an ordered list of field IDs to display as columns. Requires Jira administrator permissions.",
      inputSchema: {
        columns: z
          .array(
            z.object({
              label: z.string().describe("Column label/display name"),
              value: z.string().describe("Field ID for the column (e.g. 'summary', 'status', 'assignee', 'customfield_10001')"),
            })
          )
          .describe("Ordered list of columns to display in the issue navigator"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.set_issue_navigator_columns",
        () =>
          client.put("/rest/api/3/settings/columns", args.columns),
        { tool: "set_issue_navigator_columns" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result
              ? JSON.stringify(result, null, 2)
              : "Issue navigator columns updated.",
          },
        ],
      };
    }
  );

  // ── get_filter_columns ────────────────────────────────────────────────────
  server.registerTool(
    "get_filter_default_columns",
    {
      title: "Get Filter Default Columns",
      description:
        "Retrieve the column configuration for a saved filter. Returns the columns shown when the filter is viewed in the issue navigator.",
      inputSchema: {
        filterId: z.number().int().describe("Filter ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_filter_default_columns",
        () =>
          client.get(`/rest/api/3/filter/${args.filterId}/columns`),
        { tool: "get_filter_default_columns" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── set_filter_columns ────────────────────────────────────────────────────
  server.registerTool(
    "set_filter_columns",
    {
      title: "Set Filter Default Columns",
      description:
        "Set the default column configuration for a saved filter. Columns appear in the issue navigator when the filter is active.",
      inputSchema: {
        filterId: z.number().int().describe("Filter ID"),
        columns: z
          .array(
            z.object({
              label: z.string().describe("Column display label"),
              value: z.string().describe("Field ID for the column"),
            })
          )
          .describe("Columns to display for this filter"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.set_filter_columns",
        () =>
          client.put(
            `/rest/api/3/filter/${args.filterId}/columns`,
            args.columns
          ),
        { tool: "set_filter_columns" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Filter columns updated.",
          },
        ],
      };
    }
  );

  // ── reset_filter_columns ──────────────────────────────────────────────────
  server.registerTool(
    "reset_filter_columns",
    {
      title: "Reset Filter Columns to Default",
      description:
        "Reset the column configuration for a saved filter back to the system default columns.",
      inputSchema: {
        filterId: z.number().int().describe("Filter ID"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      await logger.time(
        "tool.reset_filter_columns",
        () =>
          client.delete(`/rest/api/3/filter/${args.filterId}/columns`),
        { tool: "reset_filter_columns" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Filter ${args.filterId} columns reset to default.`,
          },
        ],
      };
    }
  );
}
