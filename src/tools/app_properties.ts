// App Properties tools: get_app_property, set_app_property, delete_app_property,
// list_addon_properties, get_addon_property, set_addon_property, delete_addon_property
// Uses Jira Cloud REST API (Connect / Forge app properties)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_addon_properties ─────────────────────────────────────────────────
  server.registerTool(
    "list_addon_properties",
    {
      title: "List Connect App (Addon) Properties",
      description:
        "List all properties stored for a Connect app (addon). Properties are key-value stores scoped to the app. Returns property keys and their values. Requires Connect app authentication.",
      inputSchema: {
        addonKey: z
          .string()
          .describe("The Connect app key (addon key), e.g. 'com.example.myapp'"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.list_addon_properties",
        () =>
          client.get(
            `/rest/atlassian-connect/1/addons/${args.addonKey}/properties`
          ),
        { tool: "list_addon_properties" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_addon_property ────────────────────────────────────────────────────
  server.registerTool(
    "get_addon_property",
    {
      title: "Get Connect App Property",
      description:
        "Retrieve a specific property value for a Connect app (addon) by property key.",
      inputSchema: {
        addonKey: z.string().describe("Connect app key"),
        propertyKey: z.string().describe("Property key to retrieve"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_addon_property",
        () =>
          client.get(
            `/rest/atlassian-connect/1/addons/${args.addonKey}/properties/${args.propertyKey}`
          ),
        { tool: "get_addon_property" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── set_addon_property ────────────────────────────────────────────────────
  server.registerTool(
    "set_addon_property",
    {
      title: "Set Connect App Property",
      description:
        "Set or update a property for a Connect app (addon). Creates the property if it doesn't exist, updates it if it does.",
      inputSchema: {
        addonKey: z.string().describe("Connect app key"),
        propertyKey: z.string().describe("Property key to set"),
        value: z.unknown().describe("Property value (any JSON-serialisable value)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.set_addon_property",
        () =>
          client.request(
            `/rest/atlassian-connect/1/addons/${args.addonKey}/properties/${args.propertyKey}`,
            {
              method: "PUT",
              body: JSON.stringify(args.value),
            }
          ),
        { tool: "set_addon_property" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_addon_property ─────────────────────────────────────────────────
  server.registerTool(
    "delete_addon_property",
    {
      title: "Delete Connect App Property",
      description: "Delete a specific property from a Connect app (addon).",
      inputSchema: {
        addonKey: z.string().describe("Connect app key"),
        propertyKey: z.string().describe("Property key to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_addon_property",
        () =>
          client.delete(
            `/rest/atlassian-connect/1/addons/${args.addonKey}/properties/${args.propertyKey}`
          ),
        { tool: "delete_addon_property" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Property '${args.propertyKey}' deleted from addon '${args.addonKey}'.`,
          },
        ],
      };
    }
  );

  // ── list_entity_properties ────────────────────────────────────────────────
  server.registerTool(
    "list_entity_properties",
    {
      title: "List Entity Properties",
      description:
        "List all property keys for a Jira entity (issue, project, user, sprint, board, etc.). Entity properties are key-value stores attached to specific Jira resources.",
      inputSchema: {
        entityType: z
          .enum(["issue", "project", "user", "sprint", "board", "comment", "worklog"])
          .describe("The type of entity"),
        entityId: z.string().describe("The entity ID (issue key, project key, account ID, etc.)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const pathMap: Record<string, string> = {
        issue: `/rest/api/3/issue/${args.entityId}/properties`,
        project: `/rest/api/3/project/${args.entityId}/properties`,
        user: `/rest/api/3/user/properties?accountId=${args.entityId}`,
        sprint: `/agile/1.0/sprint/${args.entityId}/properties`,
        board: `/agile/1.0/board/${args.entityId}/properties`,
        comment: `/rest/api/3/comment/${args.entityId}/properties`,
        worklog: `/rest/api/3/issue/worklog/${args.entityId}/properties`,
      };

      const path = pathMap[args.entityType as string];

      const result = await logger.time(
        "tool.list_entity_properties",
        () => client.get(path),
        { tool: "list_entity_properties", entityType: args.entityType as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
