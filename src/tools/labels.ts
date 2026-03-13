// Labels tools: list_labels, get_suggested_labels
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_labels ────────────────────────────────────────────────────────────
  server.registerTool(
    "list_labels",
    {
      title: "List Labels",
      description:
        "List all labels available in the Jira instance. Returns a paginated list of label strings. Use labels in create_issue or update_issue to tag issues.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(1000).optional().describe("Results per page (default 100)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 100));

      const result = await logger.time(
        "tool.list_labels",
        () => client.get(`/label?${params}`),
        { tool: "list_labels" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_suggested_labels ───────────────────────────────────────────────────
  server.registerTool(
    "get_suggested_labels",
    {
      title: "Get Suggested Labels",
      description:
        "Get suggested label values for auto-complete, filtered by a prefix query string. Useful for finding existing labels before applying them to issues.",
      inputSchema: {
        query: z.string().optional().describe("Prefix to filter label suggestions (e.g. 'bug' returns 'bug', 'bug-fix', etc.)"),
        token: z.string().optional().describe("Pagination token from a previous response"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results to return (default 20)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.query) params.set("query", args.query as string);
      if (args.token) params.set("token", args.token as string);
      if (args.maxResults !== undefined) params.set("maxResults", String(args.maxResults));
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.get_suggested_labels",
        () => client.get(`/jql/autocompletedata/suggestions${qs}`),
        { tool: "get_suggested_labels" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
