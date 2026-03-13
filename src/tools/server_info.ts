// Server Info tools: get_server_info
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_server_info ───────────────────────────────────────────────────────
  server.registerTool(
    "get_server_info",
    {
      title: "Get Jira Server Info",
      description:
        "Get metadata about the Jira Cloud instance: base URL, version, build number, server title, deployment type, and server time. Use to verify connectivity and check the Jira version.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.get_server_info",
        () => client.get("/serverInfo"),
        { tool: "get_server_info" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_license ───────────────────────────────────────────────────────────
  server.registerTool(
    "get_license",
    {
      title: "Get Jira License",
      description:
        "Get license information for the Jira instance: active users, license type, expiry status. Requires Jira administrator permissions.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.get_license",
        () => client.get("/instance/license"),
        { tool: "get_license" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_application_roles ─────────────────────────────────────────────────
  server.registerTool(
    "get_application_roles",
    {
      title: "Get Application Roles",
      description:
        "Get all application roles (Jira Software, Jira Service Management, etc.) and their associated groups. Returns role key, groups, default groups, and user counts.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.get_application_roles",
        () => client.get("/applicationrole"),
        { tool: "get_application_roles" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { roles: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_application_role ──────────────────────────────────────────────────
  server.registerTool(
    "get_application_role",
    {
      title: "Get Application Role",
      description: "Get details of a specific application role by key (e.g. 'jira-software', 'jira-servicedesk').",
      inputSchema: {
        key: z.string().describe("Application role key (e.g. 'jira-software', 'jira-servicedesk')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_application_role",
        () => client.get(`/applicationrole/${args.key}`),
        { tool: "get_application_role" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_status_categories ─────────────────────────────────────────────────
  server.registerTool(
    "get_status_categories",
    {
      title: "Get Status Categories",
      description:
        "List all issue status categories (To Do, In Progress, Done). Status categories are the high-level groupings that statuses belong to.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.get_status_categories",
        () => client.get("/statuscategory"),
        { tool: "get_status_categories" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { categories: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_status_category ───────────────────────────────────────────────────
  server.registerTool(
    "get_status_category",
    {
      title: "Get Status Category",
      description: "Get details of a specific status category by ID or key.",
      inputSchema: {
        idOrKey: z.string().describe("Status category ID or key (e.g. '1', 'new', 'indeterminate', 'done')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_status_category",
        () => client.get(`/statuscategory/${args.idOrKey}`),
        { tool: "get_status_category" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
