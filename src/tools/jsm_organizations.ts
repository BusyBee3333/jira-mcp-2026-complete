// JSM Organizations tools: list_organizations, get_organization, create_organization,
// delete_organization, list_org_users, add_users_to_org, remove_users_from_org,
// list_servicedesk_organizations, add_org_to_servicedesk, remove_org_from_servicedesk
// Uses Jira Service Management REST API: /rest/servicedeskapi/
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_organizations ────────────────────────────────────────────────────
  server.registerTool(
    "list_organizations",
    {
      title: "List JSM Organizations",
      description:
        "List all organizations in Jira Service Management. Organizations group customers together for access control. Returns organization ID, name, and links.",
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
        "tool.list_organizations",
        () => client.request(`/servicedeskapi/organization?${params}`, { method: "GET" }),
        { tool: "list_organizations" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_organization ──────────────────────────────────────────────────────
  server.registerTool(
    "get_organization",
    {
      title: "Get JSM Organization",
      description: "Retrieve details of a specific JSM organization by ID.",
      inputSchema: {
        organizationId: z.number().int().describe("Organization ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_organization",
        () =>
          client.request(`/servicedeskapi/organization/${args.organizationId}`, { method: "GET" }),
        { tool: "get_organization" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_organization ───────────────────────────────────────────────────
  server.registerTool(
    "create_organization",
    {
      title: "Create JSM Organization",
      description:
        "Create a new organization in Jira Service Management. Organizations group customers and can be linked to service desks for customer access control.",
      inputSchema: {
        name: z.string().describe("Name of the organization"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.create_organization",
        () =>
          client.request("/servicedeskapi/organization", {
            method: "POST",
            body: JSON.stringify({ name: args.name }),
          }),
        { tool: "create_organization" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_organization ───────────────────────────────────────────────────
  server.registerTool(
    "delete_organization",
    {
      title: "Delete JSM Organization",
      description:
        "Delete a JSM organization. This does not delete the users in the organization. The organization is removed from all linked service desks.",
      inputSchema: {
        organizationId: z.number().int().describe("Organization ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_organization",
        () =>
          client.request(`/servicedeskapi/organization/${args.organizationId}`, {
            method: "DELETE",
          }),
        { tool: "delete_organization" }
      );
      return {
        content: [{ type: "text" as const, text: `Organization ${args.organizationId} deleted successfully.` }],
      };
    }
  );

  // ── list_organization_users ───────────────────────────────────────────────
  server.registerTool(
    "list_organization_users",
    {
      title: "List JSM Organization Users",
      description: "List all users that belong to a specific JSM organization.",
      inputSchema: {
        organizationId: z.number().int().describe("Organization ID"),
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
        "tool.list_organization_users",
        () =>
          client.request(
            `/servicedeskapi/organization/${args.organizationId}/user?${params}`,
            { method: "GET" }
          ),
        { tool: "list_organization_users" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_users_to_organization ─────────────────────────────────────────────
  server.registerTool(
    "add_users_to_organization",
    {
      title: "Add Users to JSM Organization",
      description: "Add one or more users (by account ID) to a JSM organization.",
      inputSchema: {
        organizationId: z.number().int().describe("Organization ID"),
        accountIds: z.array(z.string()).min(1).describe("List of account IDs to add"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.add_users_to_organization",
        () =>
          client.request(`/servicedeskapi/organization/${args.organizationId}/user`, {
            method: "POST",
            body: JSON.stringify({ accountIds: args.accountIds }),
          }),
        { tool: "add_users_to_organization" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Users added to organization.",
          },
        ],
      };
    }
  );

  // ── remove_users_from_organization ───────────────────────────────────────
  server.registerTool(
    "remove_users_from_organization",
    {
      title: "Remove Users from JSM Organization",
      description: "Remove one or more users from a JSM organization.",
      inputSchema: {
        organizationId: z.number().int().describe("Organization ID"),
        accountIds: z.array(z.string()).min(1).describe("List of account IDs to remove"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.remove_users_from_organization",
        () =>
          client.request(`/servicedeskapi/organization/${args.organizationId}/user`, {
            method: "DELETE",
            body: JSON.stringify({ accountIds: args.accountIds }),
          }),
        { tool: "remove_users_from_organization" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Users removed from organization.",
          },
        ],
      };
    }
  );

  // ── list_servicedesk_organizations ────────────────────────────────────────
  server.registerTool(
    "list_servicedesk_organizations",
    {
      title: "List Organizations for Service Desk (JSM)",
      description:
        "List all organizations associated with a specific JSM service desk. Customers in these organizations can access the service desk portal.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
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
        "tool.list_servicedesk_organizations",
        () =>
          client.request(
            `/servicedeskapi/servicedesk/${args.serviceDeskId}/organization?${params}`,
            { method: "GET" }
          ),
        { tool: "list_servicedesk_organizations" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_organization_to_servicedesk ──────────────────────────────────────
  server.registerTool(
    "add_organization_to_servicedesk",
    {
      title: "Add Organization to Service Desk (JSM)",
      description:
        "Link an organization to a JSM service desk so its members can access the customer portal.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
        organizationId: z.number().int().describe("Organization ID to add"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.add_organization_to_servicedesk",
        () =>
          client.request(`/servicedeskapi/servicedesk/${args.serviceDeskId}/organization`, {
            method: "POST",
            body: JSON.stringify({ organizationId: args.organizationId }),
          }),
        { tool: "add_organization_to_servicedesk" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Organization added to service desk.",
          },
        ],
      };
    }
  );
}
