// User Search tools: find_users_for_picker, find_users_assignable_to_projects, find_users_with_permissions, find_users_by_property, bulk_get_users
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── find_users_for_picker ─────────────────────────────────────────────────
  server.registerTool(
    "find_users_for_picker",
    {
      title: "Find Users for Picker",
      description:
        "Search for users to display in a user picker UI. Returns users matching a query with avatars, suitable for autocomplete. Searches display name, email, and username.",
      inputSchema: {
        query: z.string().describe("Text to search for in display name, email, or username"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Max results (default 10)"),
        showAvatar: z.boolean().optional().describe("Include avatar URL in results (default true)"),
        exclude: z.array(z.string()).optional().describe("Account IDs to exclude from results"),
        excludeAccountIds: z.array(z.string()).optional().describe("Additional account IDs to exclude"),
        projectId: z.array(z.string()).optional().describe("Project IDs to limit search to"),
        sessionId: z.string().optional().describe("Session ID for multi-request consistency"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ query: args.query as string });
      if (args.maxResults) params.set("maxResults", String(args.maxResults));
      if (args.showAvatar !== undefined) params.set("showAvatar", String(args.showAvatar));
      if (args.exclude) args.exclude.forEach((id) => params.append("exclude", id));
      if (args.excludeAccountIds) args.excludeAccountIds.forEach((id) => params.append("excludeAccountIds", id));
      if (args.projectId) args.projectId.forEach((id) => params.append("projectId", id));
      if (args.sessionId) params.set("sessionId", args.sessionId as string);
      const result = await logger.time(
        "tool.find_users_for_picker",
        () => client.get(`/user/picker?${params}`),
        { tool: "find_users_for_picker" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── find_users_assignable_to_projects ─────────────────────────────────────
  server.registerTool(
    "find_users_assignable_to_projects",
    {
      title: "Find Users Assignable to Projects",
      description:
        "Search for users who can be assigned to issues across multiple projects. Useful for bulk assignment workflows.",
      inputSchema: {
        projectKeys: z.string().describe("Comma-separated project keys (e.g. 'PROJ,TEAM')"),
        query: z.string().optional().describe("Optional search string for display name or email"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ projectKeys: args.projectKeys as string });
      if (args.query) params.set("query", args.query as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      const result = await logger.time(
        "tool.find_users_assignable_to_projects",
        () => client.get(`/user/assignable/multiProjectSearch?${params}`),
        { tool: "find_users_assignable_to_projects" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { users: result } as Record<string, unknown>,
      };
    }
  );

  // ── find_users_with_permissions ───────────────────────────────────────────
  server.registerTool(
    "find_users_with_permissions",
    {
      title: "Find Users with Permissions",
      description:
        "Search for users who have a specific permission in a project or issue context.",
      inputSchema: {
        permissions: z.string().describe("Comma-separated list of permission keys (e.g. 'BROWSE,CREATE_ISSUES')"),
        projectKey: z.string().optional().describe("Project key to check permissions in"),
        issueKey: z.string().optional().describe("Issue key to check permissions for"),
        query: z.string().optional().describe("Optional search string"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ permissions: args.permissions as string });
      if (args.projectKey) params.set("projectKey", args.projectKey as string);
      if (args.issueKey) params.set("issueKey", args.issueKey as string);
      if (args.query) params.set("query", args.query as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      const result = await logger.time(
        "tool.find_users_with_permissions",
        () => client.get(`/user/permission/search?${params}`),
        { tool: "find_users_with_permissions" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { users: result } as Record<string, unknown>,
      };
    }
  );

  // ── bulk_get_users ────────────────────────────────────────────────────────
  server.registerTool(
    "bulk_get_users",
    {
      title: "Bulk Get Users",
      description:
        "Get details for multiple users in a single call using their account IDs. Returns account ID, display name, email, active status, and account type.",
      inputSchema: {
        accountIds: z.array(z.string()).min(1).max(100).describe("Array of account IDs (max 100)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      args.accountIds.forEach((id) => params.append("accountId", id));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      const result = await logger.time(
        "tool.bulk_get_users",
        () => client.get(`/user/bulk?${params}`),
        { tool: "bulk_get_users" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── find_users_by_property ────────────────────────────────────────────────
  server.registerTool(
    "find_users_by_property",
    {
      title: "Find Users by Property",
      description:
        "Find users by a user property value. Useful for finding users with custom metadata set via user properties.",
      inputSchema: {
        entityType: z
          .enum(["user", "group"])
          .optional()
          .describe("Entity type to search (default: 'user')"),
        propertyKey: z.string().describe("Property key to filter by"),
        propertyValue: z.string().optional().describe("Optional property value to match"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 10)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ propertyKey: args.propertyKey as string });
      if (args.entityType) params.set("entityType", args.entityType as string);
      if (args.propertyValue) params.set("propertyValue", args.propertyValue as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 10));
      const result = await logger.time(
        "tool.find_users_by_property",
        () => client.get(`/user/search/query?${params}`),
        { tool: "find_users_by_property" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
