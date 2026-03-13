// Filters tools: list_filters, get_filter, create_filter, update_filter, delete_filter, get_filter_columns
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_filters ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_filters",
    {
      title: "List Jira Saved Filters",
      description:
        "List Jira saved filters accessible to the current user. Returns filter ID, name, owner, JQL, and share permissions. Supports filtering by favourite status and pagination.",
      inputSchema: {
        filterName: z.string().optional().describe("Filter by filter name substring"),
        accountId: z.string().optional().describe("Filter by owner account ID"),
        groupname: z.string().optional().describe("Filter by group that owns the filter"),
        projectId: z.number().int().optional().describe("Filter by project ID scope"),
        id: z.array(z.number()).optional().describe("Filter by specific filter IDs"),
        orderBy: z.enum(["description", "-description", "favourite_count", "-favourite_count", "is_favourite", "-is_favourite", "id", "-id", "name", "-name", "owner", "-owner"]).optional().describe("Sort order"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
        expand: z.string().optional().describe("Expand fields (e.g. sharedUsers,subscriptions)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.filterName) params.set("filterName", args.filterName as string);
      if (args.accountId) params.set("accountId", args.accountId as string);
      if (args.groupname) params.set("groupname", args.groupname as string);
      if (args.projectId !== undefined) params.set("projectId", String(args.projectId));
      if (args.id) (args.id as number[]).forEach((id) => params.append("id", String(id)));
      if (args.orderBy) params.set("orderBy", args.orderBy as string);
      if (args.expand) params.set("expand", args.expand as string);

      const result = await logger.time(
        "tool.list_filters",
        () => client.get(`/filter/search?${params}`),
        { tool: "list_filters" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_filter ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_filter",
    {
      title: "Get Jira Filter",
      description:
        "Get details of a specific Jira saved filter by ID. Returns the filter's name, JQL query, description, owner, share permissions, and subscribe count.",
      inputSchema: {
        filterId: z.number().int().describe("Filter ID"),
        expand: z.string().optional().describe("Expand fields (e.g. sharedUsers,subscriptions)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.get_filter",
        () => client.get(`/filter/${args.filterId}${qs}`),
        { tool: "get_filter", filterId: String(args.filterId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_filter ─────────────────────────────────────────────────────────
  server.registerTool(
    "create_filter",
    {
      title: "Create Jira Filter",
      description:
        "Create a new Jira saved filter with a JQL query. Optionally set a description, mark as favourite, and configure share permissions. Returns the created filter's ID and details.",
      inputSchema: {
        name: z.string().describe("Filter name (must be unique for the owner)"),
        jql: z.string().describe("JQL query string for the filter"),
        description: z.string().optional().describe("Filter description"),
        favourite: z.boolean().optional().describe("Mark as favourite (default false)"),
        sharePermissions: z.array(z.object({
          type: z.enum(["global", "project", "group", "projectRole", "user"]).describe("Permission type"),
          projectId: z.string().optional().describe("Project ID (for project/projectRole type)"),
          groupname: z.string().optional().describe("Group name (for group type)"),
          roleId: z.number().optional().describe("Role ID (for projectRole type)"),
        })).optional().describe("Share permissions for the filter"),
        expand: z.string().optional().describe("Expand fields in response"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        name: args.name,
        jql: args.jql,
      };
      if (args.description) body.description = args.description;
      if (args.favourite !== undefined) body.favourite = args.favourite;
      if (args.sharePermissions) body.sharePermissions = args.sharePermissions;

      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.create_filter",
        () => client.post(`/filter${qs}`, body),
        { tool: "create_filter", name: args.name as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_filter ─────────────────────────────────────────────────────────
  server.registerTool(
    "update_filter",
    {
      title: "Update Jira Filter",
      description:
        "Update an existing Jira saved filter. Can update the name, JQL query, description, favourite status, and share permissions. Returns the updated filter details.",
      inputSchema: {
        filterId: z.number().int().describe("Filter ID to update"),
        name: z.string().optional().describe("New filter name"),
        jql: z.string().optional().describe("New JQL query"),
        description: z.string().optional().describe("New description"),
        favourite: z.boolean().optional().describe("Update favourite status"),
        sharePermissions: z.array(z.object({
          type: z.enum(["global", "project", "group", "projectRole", "user"]).describe("Permission type"),
          projectId: z.string().optional().describe("Project ID"),
          groupname: z.string().optional().describe("Group name"),
          roleId: z.number().optional().describe("Role ID"),
        })).optional().describe("New share permissions"),
        expand: z.string().optional().describe("Expand fields in response"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.jql) body.jql = args.jql;
      if (args.description !== undefined) body.description = args.description;
      if (args.favourite !== undefined) body.favourite = args.favourite;
      if (args.sharePermissions) body.sharePermissions = args.sharePermissions;

      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.update_filter",
        () => client.put(`/filter/${args.filterId}${qs}`, body),
        { tool: "update_filter", filterId: String(args.filterId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_filter ─────────────────────────────────────────────────────────
  server.registerTool(
    "delete_filter",
    {
      title: "Delete Jira Filter",
      description:
        "Permanently delete a Jira saved filter by ID. This action cannot be undone. Only the filter owner or an admin can delete a filter.",
      inputSchema: {
        filterId: z.number().int().describe("Filter ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_filter",
        () => client.delete(`/filter/${args.filterId}`),
        { tool: "delete_filter", filterId: String(args.filterId) }
      );

      const result = { success: true, filterId: args.filterId };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_filter_columns ────────────────────────────────────────────────────
  server.registerTool(
    "get_filter_columns",
    {
      title: "Get Filter Columns",
      description:
        "Get the column configuration for a Jira saved filter. Returns the list of columns (fields) displayed when viewing the filter results in Jira's issue navigator.",
      inputSchema: {
        filterId: z.number().int().describe("Filter ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_filter_columns",
        () => client.get(`/filter/${args.filterId}/columns`),
        { tool: "get_filter_columns", filterId: String(args.filterId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { columns: result } as Record<string, unknown>,
      };
    }
  );
}
