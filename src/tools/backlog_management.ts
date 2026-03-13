// Backlog Management tools: move_to_backlog, move_to_sprint_from_backlog,
// get_board_backlog, rank_issues_before, rank_issues_after
// Uses Jira Software Agile REST API v1 (/rest/agile/1.0)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── move_to_backlog ───────────────────────────────────────────────────────
  server.registerTool(
    "move_to_backlog",
    {
      title: "Move Issues to Backlog",
      description:
        "Move issues from a sprint (or epic) back to the board backlog. Accepts a list of issue keys or IDs. Useful for de-scoping sprint work without deleting issues.",
      inputSchema: {
        issues: z
          .array(z.string())
          .min(1)
          .describe("List of issue keys or IDs to move to the backlog (e.g. ['PROJ-1','PROJ-2'])"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.move_to_backlog",
        () =>
          client.request("/agile/1.0/backlog/issue", {
            method: "POST",
            body: JSON.stringify({ issues: args.issues }),
          }),
        { tool: "move_to_backlog" }
      );
      return {
        content: [{ type: "text" as const, text: result ? JSON.stringify(result, null, 2) : "Issues moved to backlog successfully." }],
      };
    }
  );

  // ── get_board_backlog ─────────────────────────────────────────────────────
  server.registerTool(
    "get_board_backlog",
    {
      title: "Get Board Backlog",
      description:
        "Return all issues in the backlog of a Jira Software board. Supports JQL filtering, field selection, and pagination. Issues returned are those not assigned to any active or future sprint.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID (from list_boards)"),
        jql: z.string().optional().describe("Additional JQL to filter issues within the backlog"),
        fields: z
          .array(z.string())
          .optional()
          .describe("List of fields to return (default: summary, status, assignee, priority)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.jql) params.set("jql", args.jql as string);
      if (args.fields) params.set("fields", (args.fields as string[]).join(","));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.get_board_backlog",
        () => client.request(`/agile/1.0/board/${args.boardId}/backlog?${params}`, { method: "GET" }),
        { tool: "get_board_backlog", boardId: String(args.boardId) }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── rank_issues_before ────────────────────────────────────────────────────
  server.registerTool(
    "rank_issues_before",
    {
      title: "Rank Issues Before Another Issue",
      description:
        "Reorder (rank) a set of issues so they appear directly before a specific issue on the board/backlog. Uses the Jira Software ranking feature.",
      inputSchema: {
        issues: z
          .array(z.string())
          .min(1)
          .describe("Issue keys or IDs to rank"),
        rankBeforeIssue: z.string().describe("Issue key or ID that the issues should be ranked before"),
        rankCustomFieldId: z
          .number()
          .int()
          .optional()
          .describe("Custom field ID used for ranking (optional; auto-detected when omitted)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        issues: args.issues,
        rankBeforeIssue: args.rankBeforeIssue,
      };
      if (args.rankCustomFieldId !== undefined) body.rankCustomFieldId = args.rankCustomFieldId;

      const result = await logger.time(
        "tool.rank_issues_before",
        () =>
          client.request("/agile/1.0/issue/rank", {
            method: "PUT",
            body: JSON.stringify(body),
          }),
        { tool: "rank_issues_before" }
      );
      return {
        content: [{ type: "text" as const, text: result ? JSON.stringify(result, null, 2) : "Issues ranked successfully." }],
      };
    }
  );

  // ── rank_issues_after ─────────────────────────────────────────────────────
  server.registerTool(
    "rank_issues_after",
    {
      title: "Rank Issues After Another Issue",
      description:
        "Reorder (rank) a set of issues so they appear directly after a specific issue on the board/backlog. Uses the Jira Software ranking feature.",
      inputSchema: {
        issues: z
          .array(z.string())
          .min(1)
          .describe("Issue keys or IDs to rank"),
        rankAfterIssue: z.string().describe("Issue key or ID that the issues should be ranked after"),
        rankCustomFieldId: z
          .number()
          .int()
          .optional()
          .describe("Custom field ID used for ranking (optional; auto-detected when omitted)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        issues: args.issues,
        rankAfterIssue: args.rankAfterIssue,
      };
      if (args.rankCustomFieldId !== undefined) body.rankCustomFieldId = args.rankCustomFieldId;

      const result = await logger.time(
        "tool.rank_issues_after",
        () =>
          client.request("/agile/1.0/issue/rank", {
            method: "PUT",
            body: JSON.stringify(body),
          }),
        { tool: "rank_issues_after" }
      );
      return {
        content: [{ type: "text" as const, text: result ? JSON.stringify(result, null, 2) : "Issues ranked successfully." }],
      };
    }
  );

  // ── get_issue_rank ────────────────────────────────────────────────────────
  server.registerTool(
    "get_issue_rank",
    {
      title: "Get Issue Rank",
      description:
        "Retrieve the current rank of an issue as used by Jira Software boards. Returns the lexorank value and relative ordering information.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_issue_rank",
        () => client.request(`/agile/1.0/issue/${args.issueKeyOrId}?fields=rank`, { method: "GET" }),
        { tool: "get_issue_rank", issueKeyOrId: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
