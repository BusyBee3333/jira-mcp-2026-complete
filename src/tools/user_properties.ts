// User Properties tools: list_user_properties, get_user_property, set_user_property, delete_user_property
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_user_properties ──────────────────────────────────────────────────
  server.registerTool(
    "list_user_properties",
    {
      title: "List User Properties",
      description:
        "List all property keys stored for a Jira user. User properties are key-value pairs used for custom user metadata (e.g. by add-ons or integrations).",
      inputSchema: {
        accountId: z.string().describe("Account ID of the user"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ accountId: args.accountId as string });
      const result = await logger.time(
        "tool.list_user_properties",
        () => client.get(`/user/properties?${params}`),
        { tool: "list_user_properties" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_user_property ─────────────────────────────────────────────────────
  server.registerTool(
    "get_user_property",
    {
      title: "Get User Property",
      description: "Get the value of a specific property for a Jira user.",
      inputSchema: {
        accountId: z.string().describe("Account ID of the user"),
        propertyKey: z.string().describe("Property key to retrieve"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ accountId: args.accountId as string });
      const result = await logger.time(
        "tool.get_user_property",
        () => client.get(`/user/properties/${args.propertyKey}?${params}`),
        { tool: "get_user_property" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── set_user_property ─────────────────────────────────────────────────────
  server.registerTool(
    "set_user_property",
    {
      title: "Set User Property",
      description: "Create or update a property on a Jira user. The value can be any JSON data.",
      inputSchema: {
        accountId: z.string().describe("Account ID of the user"),
        propertyKey: z.string().describe("Property key to set"),
        value: z.unknown().describe("JSON value to store"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ accountId: args.accountId as string });
      const result = await logger.time(
        "tool.set_user_property",
        () => client.put(`/user/properties/${args.propertyKey}?${params}`, args.value),
        { tool: "set_user_property" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_user_property ──────────────────────────────────────────────────
  server.registerTool(
    "delete_user_property",
    {
      title: "Delete User Property",
      description: "Delete a specific property from a Jira user.",
      inputSchema: {
        accountId: z.string().describe("Account ID of the user"),
        propertyKey: z.string().describe("Property key to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ accountId: args.accountId as string });
      const result = await logger.time(
        "tool.delete_user_property",
        () => client.delete(`/user/properties/${args.propertyKey}?${params}`),
        { tool: "delete_user_property" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_user_columns ──────────────────────────────────────────────────────
  server.registerTool(
    "get_user_columns",
    {
      title: "Get User Default Columns",
      description:
        "Get the issue navigator column configuration for a user. These are the columns shown in the issue navigator for a specific user.",
      inputSchema: {
        accountId: z.string().optional().describe("Account ID of the user (omit for current user)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.accountId) params.set("accountId", args.accountId as string);
      const qs = params.toString() ? `?${params}` : "";
      const result = await logger.time(
        "tool.get_user_columns",
        () => client.get(`/user/columns${qs}`),
        { tool: "get_user_columns" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { columns: result } as Record<string, unknown>,
      };
    }
  );

  // ── reset_user_columns ────────────────────────────────────────────────────
  server.registerTool(
    "reset_user_columns",
    {
      title: "Reset User Default Columns",
      description: "Reset the issue navigator column configuration for a user to the system default.",
      inputSchema: {
        accountId: z.string().optional().describe("Account ID of the user (omit for current user)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.accountId) params.set("accountId", args.accountId as string);
      const qs = params.toString() ? `?${params}` : "";
      const result = await logger.time(
        "tool.reset_user_columns",
        () => client.delete(`/user/columns${qs}`),
        { tool: "reset_user_columns" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
