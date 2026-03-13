// Users tools: get_user, find_users_by_query, get_user_groups, list_all_users, get_account_ids
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

  // ── find_users_by_query ────────────────────────────────────────────────────
  server.registerTool(
    "find_users_by_query",
    {
      title: "Find Jira Users by Query",
      description:
        "Search for Jira users by display name, email, or username using a text query. Returns matching users with account ID, display name, email address, and active status. Use this to find account IDs before assigning issues.",
      inputSchema: {
        query: z.string().describe("Search string — matches against display name, email, or username"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
        includeActive: z.boolean().optional().describe("Include active users (default true)"),
        includeInactive: z.boolean().optional().describe("Include inactive users (default false)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("query", args.query as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.includeActive !== undefined) params.set("includeActive", String(args.includeActive));
      if (args.includeInactive !== undefined) params.set("includeInactive", String(args.includeInactive));

      const result = await logger.time(
        "tool.find_users_by_query",
        () => client.get(`/user/search?${params}`),
        { tool: "find_users_by_query", query: args.query as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { users: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_user_groups ────────────────────────────────────────────────────────
  server.registerTool(
    "get_user_groups",
    {
      title: "Get User Groups",
      description:
        "Get all groups that a Jira user belongs to. Returns an array of group objects with group name and group ID. Requires admin permissions to view groups for other users.",
      inputSchema: {
        accountId: z.string().describe("Account ID of the user"),
        username: z.string().optional().describe("Username (deprecated in Jira Cloud — prefer accountId)"),
        key: z.string().optional().describe("User key (deprecated — prefer accountId)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("accountId", args.accountId as string);
      if (args.username) params.set("username", args.username as string);
      if (args.key) params.set("key", args.key as string);

      const result = await logger.time(
        "tool.get_user_groups",
        () => client.get(`/user/groups?${params}`),
        { tool: "get_user_groups", accountId: args.accountId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { groups: result } as Record<string, unknown>,
      };
    }
  );

  // ── list_all_users ─────────────────────────────────────────────────────────
  server.registerTool(
    "list_all_users",
    {
      title: "List All Jira Users",
      description:
        "List all users in a Jira instance. Returns account ID, display name, email, active status, and account type for each user. Supports pagination. Note: requires Browse Users global permission. For searching by name, use find_users_by_query instead.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50, max 200)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.list_all_users",
        () => client.get(`/users/search?${params}`),
        { tool: "list_all_users" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { users: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_account_ids ────────────────────────────────────────────────────────
  server.registerTool(
    "get_account_ids",
    {
      title: "Get Account IDs for Assignable Users",
      description:
        "Find account IDs for users assignable to issues in a specific project, issue, or issue type. Returns user display names, account IDs, email addresses, and avatars. Essential for finding valid assignee account IDs before assigning issues.",
      inputSchema: {
        project: z.string().optional().describe("Project key (e.g. PROJ) — find users assignable in this project"),
        issueKey: z.string().optional().describe("Issue key (e.g. PROJ-123) — find users assignable to this issue"),
        issueTypeId: z.string().optional().describe("Issue type ID — find users assignable to this issue type"),
        query: z.string().optional().describe("Optional search string to filter by display name"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      if (!args.project && !args.issueKey && !args.issueTypeId) {
        throw new Error("At least one of project, issueKey, or issueTypeId must be provided");
      }

      const params = new URLSearchParams();
      if (args.project) params.set("project", args.project as string);
      if (args.issueKey) params.set("issueKey", args.issueKey as string);
      if (args.issueTypeId) params.set("issueType", args.issueTypeId as string);
      if (args.query) params.set("query", args.query as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.get_account_ids",
        () => client.get(`/user/assignable/search?${params}`),
        { tool: "get_account_ids" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { assignableUsers: result } as Record<string, unknown>,
      };
    }
  );
}
