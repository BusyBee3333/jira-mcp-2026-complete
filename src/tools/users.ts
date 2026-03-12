// Users tools: get_user
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_user ───────────────────────────────────────────────────────────────
  server.registerTool(
    "get_user",
    {
      title: "Get Jira User",
      description:
        "Get Jira user details by account ID. Returns display name, email, avatar URL, timezone, and locale. Use to look up user info for assignees or reporters. Account IDs appear in issue.fields.assignee.accountId.",
      inputSchema: {
        accountId: z.string().optional().describe("Jira account ID (e.g. 712020:a1b2c3...)"),
        username: z.string().optional().describe("Username (deprecated in Jira Cloud — prefer accountId)"),
        key: z.string().optional().describe("User key (deprecated — prefer accountId)"),
        expand: z.string().optional().describe("Expand fields (e.g. groups,applicationRoles)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      if (!args.accountId && !args.username && !args.key) {
        throw new Error("At least one of accountId, username, or key must be provided");
      }

      const params = new URLSearchParams();
      if (args.accountId) params.set("accountId", args.accountId as string);
      if (args.username) params.set("username", args.username as string);
      if (args.key) params.set("key", args.key as string);
      if (args.expand) params.set("expand", args.expand as string);

      const result = await logger.time(
        "tool.get_user",
        () => client.get(`/user?${params}`),
        { tool: "get_user" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
