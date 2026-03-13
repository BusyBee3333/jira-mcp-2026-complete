// Reindex tools: trigger_reindex, get_reindex_progress, get_reindex_info
// Uses Jira Cloud REST API v3 (/rest/api/3/reindex)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_reindex_info ──────────────────────────────────────────────────────
  server.registerTool(
    "get_reindex_info",
    {
      title: "Get Reindex Information",
      description:
        "Check whether a Jira reindex is currently running and retrieve its status. Returns the current reindex type, completion percentage, and any errors encountered. Requires Jira administrator permissions.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.get_reindex_info",
        () => client.get("/rest/api/3/reindex"),
        { tool: "get_reindex_info" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── trigger_reindex ───────────────────────────────────────────────────────
  server.registerTool(
    "trigger_reindex",
    {
      title: "Trigger Jira Reindex",
      description:
        "Initiate a Jira reindex operation. Use BACKGROUND_PREFERRED for a non-locking background reindex. Use FOREGROUND for a full blocking reindex. Requires Jira administrator permissions.",
      inputSchema: {
        type: z
          .enum(["FOREGROUND", "BACKGROUND", "BACKGROUND_PREFERRED"])
          .optional()
          .describe("Reindex type (default: BACKGROUND_PREFERRED)"),
        indexComments: z
          .boolean()
          .optional()
          .describe("Whether to also reindex comments (default: false)"),
        indexChangeHistory: z
          .boolean()
          .optional()
          .describe("Whether to also reindex change history (default: false)"),
        indexWorklogs: z
          .boolean()
          .optional()
          .describe("Whether to also reindex worklogs (default: false)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("type", (args.type as string) ?? "BACKGROUND_PREFERRED");
      if (args.indexComments !== undefined)
        params.set("indexComments", String(args.indexComments));
      if (args.indexChangeHistory !== undefined)
        params.set("indexChangeHistory", String(args.indexChangeHistory));
      if (args.indexWorklogs !== undefined)
        params.set("indexWorklogs", String(args.indexWorklogs));

      const result = await logger.time(
        "tool.trigger_reindex",
        () =>
          client.request(`/rest/api/3/reindex?${params}`, { method: "POST", body: "" }),
        { tool: "trigger_reindex" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result
              ? JSON.stringify(result, null, 2)
              : "Reindex started successfully.",
          },
        ],
      };
    }
  );

  // ── get_reindex_progress ──────────────────────────────────────────────────
  server.registerTool(
    "get_reindex_progress",
    {
      title: "Get Reindex Progress",
      description:
        "Poll the progress of a running Jira reindex operation using the reindex request ID returned by trigger_reindex. Returns percentage complete and current phase.",
      inputSchema: {
        requestId: z
          .number()
          .int()
          .optional()
          .describe("Reindex request ID from trigger_reindex (omit to get current reindex status)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const url =
        args.requestId !== undefined
          ? `/rest/api/3/reindex/progress?requestId=${args.requestId}`
          : "/rest/api/3/reindex/progress";

      const result = await logger.time(
        "tool.get_reindex_progress",
        () => client.get(url),
        { tool: "get_reindex_progress" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
