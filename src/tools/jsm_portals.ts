// JSM Portal tools: list_portals, get_portal, list_portal_request_types,
// list_portal_groups, list_portal_customers, add_portal_customer, remove_portal_customer
// Uses Jira Service Management REST API: /rest/servicedeskapi/
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_portals ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_portals",
    {
      title: "List JSM Customer Portals",
      description:
        "List all JSM customer portals. A portal is the customer-facing UI for a service desk. Returns portal ID, name, URL, and description.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("start", String(args.startAt ?? 0));
      params.set("limit", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.list_portals",
        () => client.request(`/servicedeskapi/portal?${params}`, { method: "GET" }),
        { tool: "list_portals" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_portal ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_portal",
    {
      title: "Get JSM Customer Portal",
      description:
        "Retrieve details of a specific JSM customer portal including its URL, description, and branding settings.",
      inputSchema: {
        portalId: z.number().int().describe("Portal ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_portal",
        () => client.request(`/servicedeskapi/portal/${args.portalId}`, { method: "GET" }),
        { tool: "get_portal" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_portal_request_type_groups ──────────────────────────────────────
  server.registerTool(
    "list_portal_request_type_groups",
    {
      title: "List Portal Request Type Groups (JSM)",
      description:
        "List all request type groups (categories) visible in a JSM portal. Used to organise request types on the customer portal.",
      inputSchema: {
        portalId: z.number().int().describe("Portal ID"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("start", String(args.startAt ?? 0));
      params.set("limit", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.list_portal_request_type_groups",
        () =>
          client.request(
            `/servicedeskapi/portal/${args.portalId}/requesttypegroup?${params}`,
            { method: "GET" }
          ),
        { tool: "list_portal_request_type_groups" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_servicedesk_customers ────────────────────────────────────────────
  server.registerTool(
    "list_servicedesk_customers",
    {
      title: "List Service Desk Customers (JSM)",
      description:
        "List all customers who have access to a JSM service desk. Returns account ID, display name, and email.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
        query: z
          .string()
          .optional()
          .describe("Filter customers by name or email (partial match)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.query) params.set("query", args.query as string);
      params.set("start", String(args.startAt ?? 0));
      params.set("limit", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.list_servicedesk_customers",
        () =>
          client.request(
            `/servicedeskapi/servicedesk/${args.serviceDeskId}/customer?${params}`,
            { method: "GET" }
          ),
        { tool: "list_servicedesk_customers" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_servicedesk_customers ─────────────────────────────────────────────
  server.registerTool(
    "add_servicedesk_customers",
    {
      title: "Add Customers to Service Desk (JSM)",
      description:
        "Grant one or more customers access to a JSM service desk portal. Customers must have Jira accounts.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
        accountIds: z.array(z.string()).min(1).describe("Account IDs to add as customers"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.add_servicedesk_customers",
        () =>
          client.request(`/servicedeskapi/servicedesk/${args.serviceDeskId}/customer`, {
            method: "POST",
            body: JSON.stringify({ accountIds: args.accountIds }),
          }),
        { tool: "add_servicedesk_customers" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Customers added to service desk.",
          },
        ],
      };
    }
  );

  // ── remove_servicedesk_customers ──────────────────────────────────────────
  server.registerTool(
    "remove_servicedesk_customers",
    {
      title: "Remove Customers from Service Desk (JSM)",
      description:
        "Revoke one or more customers' access to a JSM service desk portal.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
        accountIds: z.array(z.string()).min(1).describe("Account IDs to remove"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.remove_servicedesk_customers",
        () =>
          client.request(`/servicedeskapi/servicedesk/${args.serviceDeskId}/customer`, {
            method: "DELETE",
            body: JSON.stringify({ accountIds: args.accountIds }),
          }),
        { tool: "remove_servicedesk_customers" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Customers removed from service desk.",
          },
        ],
      };
    }
  );
}
