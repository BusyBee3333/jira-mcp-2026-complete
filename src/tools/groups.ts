// Groups tools: get_group, create_group, delete_group, find_groups, get_group_members, add_user_to_group, remove_user_from_group, bulk_get_groups
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_group ─────────────────────────────────────────────────────────────
  server.registerTool(
    "get_group",
    {
      title: "Get Group",
      description: "Get details of a Jira group by name or groupId. Returns group name, ID, and optionally members.",
      inputSchema: {
        groupname: z.string().optional().describe("Group name (deprecated — prefer groupId)"),
        groupId: z.string().optional().describe("Group ID (preferred)"),
        expand: z.string().optional().describe("Expand fields (e.g. 'users')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      if (!args.groupname && !args.groupId) throw new Error("Provide groupname or groupId");
      const params = new URLSearchParams();
      if (args.groupname) params.set("groupname", args.groupname as string);
      if (args.groupId) params.set("groupId", args.groupId as string);
      if (args.expand) params.set("expand", args.expand as string);
      const result = await logger.time(
        "tool.get_group",
        () => client.get(`/group?${params}`),
        { tool: "get_group" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_group ──────────────────────────────────────────────────────────
  server.registerTool(
    "create_group",
    {
      title: "Create Group",
      description: "Create a new group in Jira. Returns the created group details.",
      inputSchema: {
        name: z.string().describe("Name for the new group"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.create_group",
        () => client.post("/group", { name: args.name }),
        { tool: "create_group" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_group ──────────────────────────────────────────────────────────
  server.registerTool(
    "delete_group",
    {
      title: "Delete Group",
      description: "Delete a Jira group. Members of the group are not deleted. Optionally transfer restrictions to another group.",
      inputSchema: {
        groupname: z.string().optional().describe("Group name to delete"),
        groupId: z.string().optional().describe("Group ID to delete"),
        swapGroupname: z.string().optional().describe("Swap group restrictions to this group name"),
        swapGroupId: z.string().optional().describe("Swap group restrictions to this group ID"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      if (!args.groupname && !args.groupId) throw new Error("Provide groupname or groupId");
      const params = new URLSearchParams();
      if (args.groupname) params.set("groupname", args.groupname as string);
      if (args.groupId) params.set("groupId", args.groupId as string);
      if (args.swapGroupname) params.set("swapGroupname", args.swapGroupname as string);
      if (args.swapGroupId) params.set("swapGroupId", args.swapGroupId as string);
      const result = await logger.time(
        "tool.delete_group",
        () => client.delete(`/group?${params}`),
        { tool: "delete_group" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── find_groups ───────────────────────────────────────────────────────────
  server.registerTool(
    "find_groups",
    {
      title: "Find Groups",
      description:
        "Find groups matching a query string. Returns group names and IDs. Supports filtering by groups the user can add users to, and by permissions.",
      inputSchema: {
        query: z.string().optional().describe("Search string to filter groups by name"),
        exclude: z.array(z.string()).optional().describe("Group names to exclude from results"),
        excludeId: z.array(z.string()).optional().describe("Group IDs to exclude"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Max results (default 20)"),
        caseInsensitive: z.boolean().optional().describe("Case-insensitive search (default true)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.query) params.set("query", args.query as string);
      if (args.exclude) args.exclude.forEach((e) => params.append("exclude", e));
      if (args.excludeId) args.excludeId.forEach((e) => params.append("excludeId", e));
      params.set("maxResults", String(args.maxResults ?? 20));
      if (args.caseInsensitive !== undefined) params.set("caseInsensitive", String(args.caseInsensitive));
      const result = await logger.time(
        "tool.find_groups",
        () => client.get(`/groups/picker?${params}`),
        { tool: "find_groups" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_group_members ─────────────────────────────────────────────────────
  server.registerTool(
    "get_group_members",
    {
      title: "Get Group Members",
      description:
        "List all users in a Jira group with pagination. Returns account ID, display name, email for each member.",
      inputSchema: {
        groupname: z.string().optional().describe("Group name"),
        groupId: z.string().optional().describe("Group ID (preferred)"),
        includeInactiveUsers: z.boolean().optional().describe("Include inactive users (default false)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      if (!args.groupname && !args.groupId) throw new Error("Provide groupname or groupId");
      const params = new URLSearchParams();
      if (args.groupname) params.set("groupname", args.groupname as string);
      if (args.groupId) params.set("groupId", args.groupId as string);
      if (args.includeInactiveUsers !== undefined) params.set("includeInactiveUsers", String(args.includeInactiveUsers));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      const result = await logger.time(
        "tool.get_group_members",
        () => client.get(`/group/member?${params}`),
        { tool: "get_group_members" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_user_to_group ─────────────────────────────────────────────────────
  server.registerTool(
    "add_user_to_group",
    {
      title: "Add User to Group",
      description: "Add a user to a Jira group by account ID.",
      inputSchema: {
        accountId: z.string().describe("Account ID of the user to add"),
        groupname: z.string().optional().describe("Group name"),
        groupId: z.string().optional().describe("Group ID"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      if (!args.groupname && !args.groupId) throw new Error("Provide groupname or groupId");
      const params = new URLSearchParams();
      if (args.groupname) params.set("groupname", args.groupname as string);
      if (args.groupId) params.set("groupId", args.groupId as string);
      const result = await logger.time(
        "tool.add_user_to_group",
        () => client.post(`/group/user?${params}`, { accountId: args.accountId }),
        { tool: "add_user_to_group" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── remove_user_from_group ────────────────────────────────────────────────
  server.registerTool(
    "remove_user_from_group",
    {
      title: "Remove User from Group",
      description: "Remove a user from a Jira group.",
      inputSchema: {
        accountId: z.string().describe("Account ID of the user to remove"),
        groupname: z.string().optional().describe("Group name"),
        groupId: z.string().optional().describe("Group ID"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      if (!args.groupname && !args.groupId) throw new Error("Provide groupname or groupId");
      const params = new URLSearchParams({ accountId: args.accountId as string });
      if (args.groupname) params.set("groupname", args.groupname as string);
      if (args.groupId) params.set("groupId", args.groupId as string);
      const result = await logger.time(
        "tool.remove_user_from_group",
        () => client.delete(`/group/user?${params}`),
        { tool: "remove_user_from_group" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── bulk_get_groups ───────────────────────────────────────────────────────
  server.registerTool(
    "bulk_get_groups",
    {
      title: "Bulk Get Groups",
      description:
        "Get multiple groups at once by group IDs. Returns group names, IDs, and member counts.",
      inputSchema: {
        groupId: z.array(z.string()).describe("Array of group IDs to retrieve"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      args.groupId.forEach((id) => params.append("groupId", id));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      const result = await logger.time(
        "tool.bulk_get_groups",
        () => client.get(`/group/bulk?${params}`),
        { tool: "bulk_get_groups" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
