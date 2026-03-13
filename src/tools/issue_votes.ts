// Issue Votes tools: get_issue_votes, add_vote, remove_vote
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_issue_votes ───────────────────────────────────────────────────────
  server.registerTool(
    "get_issue_votes",
    {
      title: "Get Issue Votes",
      description:
        "Get vote information for a Jira issue. Returns the total vote count, whether the current user has voted, and optionally the list of voters.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_issue_votes",
        () => client.get(`/issue/${args.issueKeyOrId}/votes`),
        { tool: "get_issue_votes", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_vote ──────────────────────────────────────────────────────────────
  server.registerTool(
    "add_vote",
    {
      title: "Add Vote to Issue",
      description:
        "Cast a vote on a Jira issue as the current authenticated user. Voting indicates interest in having the issue resolved.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.add_vote",
        () => client.post(`/issue/${args.issueKeyOrId}/votes`, {}),
        { tool: "add_vote", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── remove_vote ───────────────────────────────────────────────────────────
  server.registerTool(
    "remove_vote",
    {
      title: "Remove Vote from Issue",
      description: "Remove the current user's vote from a Jira issue.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.remove_vote",
        () => client.delete(`/issue/${args.issueKeyOrId}/votes`),
        { tool: "remove_vote", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
