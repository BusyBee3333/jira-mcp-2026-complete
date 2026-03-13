// Notification Schemes Detailed tools: create_notification_scheme,
// update_notification_scheme, delete_notification_scheme,
// add_notifications_to_scheme, remove_notification_from_scheme,
// get_project_notification_scheme, assign_notification_scheme_to_project
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── create_notification_scheme ────────────────────────────────────────────
  server.registerTool(
    "create_notification_scheme",
    {
      title: "Create Notification Scheme",
      description:
        "Create a new notification scheme. A notification scheme defines who receives email notifications for issue events (created, updated, commented, etc.).",
      inputSchema: {
        name: z.string().describe("Notification scheme name"),
        description: z.string().optional().describe("Description"),
        notificationSchemeEvents: z
          .array(
            z.object({
              event: z
                .object({
                  id: z.number().int().describe("Event ID (e.g. 1=Issue Created, 2=Issue Updated)"),
                })
                .describe("The issue event"),
              notifications: z
                .array(
                  z.object({
                    notificationType: z
                      .string()
                      .describe(
                        "Type: 'CurrentAssignee', 'Reporter', 'CurrentUser', 'ProjectLead', 'ComponentLead', 'User', 'Group', 'ProjectRole', 'EmailAddress', 'AllWatchers', 'UserCustomField', 'GroupCustomField'"
                      ),
                    parameter: z.string().optional().describe("Type-specific parameter"),
                  })
                )
                .describe("Who to notify for this event"),
            })
          )
          .optional()
          .describe("Initial notification events and their recipients"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = { name: args.name };
      if (args.description) body.description = args.description;
      if (args.notificationSchemeEvents)
        body.notificationSchemeEvents = args.notificationSchemeEvents;

      const result = await logger.time(
        "tool.create_notification_scheme",
        () => client.post("/rest/api/3/notificationscheme", body),
        { tool: "create_notification_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_notification_scheme ────────────────────────────────────────────
  server.registerTool(
    "update_notification_scheme",
    {
      title: "Update Notification Scheme",
      description: "Update the name and/or description of an existing notification scheme.",
      inputSchema: {
        notificationSchemeId: z.string().describe("Notification scheme ID"),
        name: z.string().optional().describe("New scheme name"),
        description: z.string().optional().describe("New description"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;

      const result = await logger.time(
        "tool.update_notification_scheme",
        () =>
          client.put(
            `/rest/api/3/notificationscheme/${args.notificationSchemeId}`,
            body
          ),
        { tool: "update_notification_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_notification_scheme ────────────────────────────────────────────
  server.registerTool(
    "delete_notification_scheme",
    {
      title: "Delete Notification Scheme",
      description:
        "Delete a notification scheme. Cannot delete the default notification scheme. Projects using this scheme will revert to the default.",
      inputSchema: {
        notificationSchemeId: z.string().describe("Notification scheme ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_notification_scheme",
        () =>
          client.delete(
            `/rest/api/3/notificationscheme/${args.notificationSchemeId}`
          ),
        { tool: "delete_notification_scheme" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Notification scheme ${args.notificationSchemeId} deleted.`,
          },
        ],
      };
    }
  );

  // ── add_notifications_to_scheme ───────────────────────────────────────────
  server.registerTool(
    "add_notifications_to_scheme",
    {
      title: "Add Notifications to Scheme",
      description:
        "Add notification recipients to one or more events in a notification scheme.",
      inputSchema: {
        notificationSchemeId: z.string().describe("Notification scheme ID"),
        notificationSchemeEvents: z
          .array(
            z.object({
              event: z.object({ id: z.number().int() }),
              notifications: z
                .array(
                  z.object({
                    notificationType: z.string(),
                    parameter: z.string().optional(),
                  })
                ),
            })
          )
          .min(1)
          .describe("Events and their notification recipients to add"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.add_notifications_to_scheme",
        () =>
          client.put(
            `/rest/api/3/notificationscheme/${args.notificationSchemeId}/notification`,
            { notificationSchemeEvents: args.notificationSchemeEvents }
          ),
        { tool: "add_notifications_to_scheme" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Notifications added to scheme.",
          },
        ],
      };
    }
  );

  // ── remove_notification_from_scheme ──────────────────────────────────────
  server.registerTool(
    "remove_notification_from_scheme",
    {
      title: "Remove Notification from Scheme",
      description:
        "Remove a specific notification recipient from a notification scheme by notification ID.",
      inputSchema: {
        notificationSchemeId: z.string().describe("Notification scheme ID"),
        notificationId: z.string().describe("Notification ID to remove"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.remove_notification_from_scheme",
        () =>
          client.delete(
            `/rest/api/3/notificationscheme/${args.notificationSchemeId}/notification/${args.notificationId}`
          ),
        { tool: "remove_notification_from_scheme" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Notification ${args.notificationId} removed from scheme ${args.notificationSchemeId}.`,
          },
        ],
      };
    }
  );

  // ── get_project_notification_scheme ───────────────────────────────────────
  server.registerTool(
    "get_project_notification_scheme",
    {
      title: "Get Project Notification Scheme",
      description:
        "Retrieve the notification scheme assigned to a specific project, including all events and their configured recipients.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. 'PROJ') or ID"),
        expand: z
          .string()
          .optional()
          .describe("Expand fields: 'all' or specific expansions like 'notificationSchemeEvents.actor'"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);

      const result = await logger.time(
        "tool.get_project_notification_scheme",
        () =>
          client.get(
            `/rest/api/3/project/${args.projectKeyOrId}/notificationscheme?${params}`
          ),
        { tool: "get_project_notification_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
