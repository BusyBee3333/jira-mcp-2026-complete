// Dashboards tools: list_dashboards, get_dashboard, create_dashboard, update_dashboard, delete_dashboard, get_dashboard_items_page_bean, copy_dashboard
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_dashboards ───────────────────────────────────────────────────────
  server.registerTool(
    "list_dashboards",
    {
      title: "List Dashboards",
      description:
        "List Jira dashboards. Can filter by my dashboards or starred dashboards. Returns ID, name, owner, shareable status. Supports pagination.",
      inputSchema: {
        filter: z
          .enum(["my", "starred"])
          .optional()
          .describe("Filter: 'my' for dashboards owned by current user, 'starred' for starred dashboards"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 20)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.filter) params.set("filter", args.filter as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 20));
      const result = await logger.time(
        "tool.list_dashboards",
        () => client.get(`/dashboard?${params}`),
        { tool: "list_dashboards" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── search_dashboards ─────────────────────────────────────────────────────
  server.registerTool(
    "search_dashboards",
    {
      title: "Search Dashboards",
      description:
        "Search for dashboards by name or description. Returns matching dashboards with pagination support.",
      inputSchema: {
        dashboardName: z.string().optional().describe("Dashboard name to search for (partial match)"),
        accountId: z.string().optional().describe("Filter by owner account ID"),
        groupname: z.string().optional().describe("Filter by share permission group name"),
        projectId: z.string().optional().describe("Filter by project ID share permission"),
        orderBy: z
          .enum(["name", "-name", "owner", "-owner", "lastViewed", "-lastViewed", "created", "-created", "description", "-description", "favourite_count", "-favourite_count"])
          .optional()
          .describe("Sort order for results"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 20)"),
        status: z.enum(["active", "archived", "deleted"]).optional().describe("Filter by status"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.dashboardName) params.set("dashboardName", args.dashboardName as string);
      if (args.accountId) params.set("accountId", args.accountId as string);
      if (args.groupname) params.set("groupname", args.groupname as string);
      if (args.projectId) params.set("projectId", args.projectId as string);
      if (args.orderBy) params.set("orderBy", args.orderBy as string);
      if (args.status) params.set("status", args.status as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 20));
      const result = await logger.time(
        "tool.search_dashboards",
        () => client.get(`/dashboard/search?${params}`),
        { tool: "search_dashboards" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_dashboard ─────────────────────────────────────────────────────────
  server.registerTool(
    "get_dashboard",
    {
      title: "Get Dashboard",
      description: "Get details of a specific Jira dashboard by ID. Returns name, owner, share permissions, and gadgets.",
      inputSchema: {
        dashboardId: z.string().describe("Dashboard ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_dashboard",
        () => client.get(`/dashboard/${args.dashboardId}`),
        { tool: "get_dashboard" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_dashboard ──────────────────────────────────────────────────────
  server.registerTool(
    "create_dashboard",
    {
      title: "Create Dashboard",
      description: "Create a new Jira dashboard with specified name, description, and share permissions.",
      inputSchema: {
        name: z.string().describe("Dashboard name"),
        description: z.string().optional().describe("Dashboard description"),
        sharePermissions: z
          .array(
            z.object({
              type: z.enum(["global", "loggedin", "project", "role", "group", "user"]),
              projectId: z.string().optional(),
              roleId: z.number().optional(),
              groupId: z.string().optional(),
              accountId: z.string().optional(),
            })
          )
          .optional()
          .describe("Share permissions for the dashboard"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = { name: args.name };
      if (args.description) payload.description = args.description;
      if (args.sharePermissions) payload.sharePermissions = args.sharePermissions;
      const result = await logger.time(
        "tool.create_dashboard",
        () => client.post("/dashboard", payload),
        { tool: "create_dashboard" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_dashboard ──────────────────────────────────────────────────────
  server.registerTool(
    "update_dashboard",
    {
      title: "Update Dashboard",
      description: "Update an existing Jira dashboard name, description, or share permissions.",
      inputSchema: {
        dashboardId: z.string().describe("Dashboard ID to update"),
        name: z.string().optional().describe("New name for the dashboard"),
        description: z.string().optional().describe("New description"),
        sharePermissions: z
          .array(
            z.object({
              type: z.enum(["global", "loggedin", "project", "role", "group", "user"]),
              projectId: z.string().optional(),
              roleId: z.number().optional(),
              groupId: z.string().optional(),
              accountId: z.string().optional(),
            })
          )
          .optional()
          .describe("Updated share permissions"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = {};
      if (args.name) payload.name = args.name;
      if (args.description) payload.description = args.description;
      if (args.sharePermissions) payload.sharePermissions = args.sharePermissions;
      const result = await logger.time(
        "tool.update_dashboard",
        () => client.put(`/dashboard/${args.dashboardId}`, payload),
        { tool: "update_dashboard" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_dashboard ──────────────────────────────────────────────────────
  server.registerTool(
    "delete_dashboard",
    {
      title: "Delete Dashboard",
      description: "Delete a Jira dashboard by ID. Only the owner can delete a dashboard.",
      inputSchema: {
        dashboardId: z.string().describe("Dashboard ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_dashboard",
        () => client.delete(`/dashboard/${args.dashboardId}`),
        { tool: "delete_dashboard" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── copy_dashboard ────────────────────────────────────────────────────────
  server.registerTool(
    "copy_dashboard",
    {
      title: "Copy Dashboard",
      description: "Copy an existing Jira dashboard into a new dashboard with the same gadgets.",
      inputSchema: {
        dashboardId: z.string().describe("ID of the dashboard to copy"),
        name: z.string().describe("Name for the new (copied) dashboard"),
        description: z.string().optional().describe("Description for the copied dashboard"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = { name: args.name };
      if (args.description) payload.description = args.description;
      const result = await logger.time(
        "tool.copy_dashboard",
        () => client.post(`/dashboard/${args.dashboardId}/copy`, payload),
        { tool: "copy_dashboard" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
