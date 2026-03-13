// Issue Watchers tools: get_issue_watchers, add_watcher, remove_watcher
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_issue_watchers ────────────────────────────────────────────────────
  server.registerTool(
    "get_issue_watchers",
    {
      title: "Get Issue Watchers",
      description:
        "Get the list of users watching a Jira issue. Returns watch count, whether the current user is watching, and list of watchers (if permitted).",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_issue_watchers",
        () => client.get(`/issue/${args.issueKeyOrId}/watchers`),
        { tool: "get_issue_watchers", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_watcher ───────────────────────────────────────────────────────────
  server.registerTool(
    "add_watcher",
    {
      title: "Add Watcher to Issue",
      description:
        "Add a user as a watcher on a Jira issue. Pass the account ID of the user to add. To watch as the current user, pass your own account ID.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        accountId: z.string().describe("Account ID of the user to add as watcher"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.add_watcher",
        () => client.post(`/issue/${args.issueKeyOrId}/watchers`, args.accountId),
        { tool: "add_watcher", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── remove_watcher ────────────────────────────────────────────────────────
  server.registerTool(
    "remove_watcher",
    {
      title: "Remove Watcher from Issue",
      description: "Remove a user from the watchers list of a Jira issue.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        accountId: z.string().describe("Account ID of the user to remove from watchers"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ accountId: args.accountId as string });
      const result = await logger.time(
        "tool.remove_watcher",
        () => client.delete(`/issue/${args.issueKeyOrId}/watchers?${params}`),
        { tool: "remove_watcher", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
