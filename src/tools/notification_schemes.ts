// Notification Schemes tools: list_notification_schemes, get_notification_scheme
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_notification_schemes ─────────────────────────────────────────────
  server.registerTool(
    "list_notification_schemes",
    {
      title: "List Notification Schemes",
      description:
        "List all notification schemes in the Jira instance. Notification schemes define which email notifications are sent for which events to which users or groups. Returns scheme ID, name, description, and linked projects.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
        id: z.array(z.number()).optional().describe("Filter by notification scheme IDs"),
        projectId: z.array(z.string()).optional().describe("Filter by project IDs that use these schemes"),
        onlyDefault: z.boolean().optional().describe("Return only the default notification scheme"),
        expand: z.string().optional().describe("Expand fields (e.g. all, field, group, notificationSchemeEvents, projectRole, user)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.id) (args.id as number[]).forEach((id) => params.append("id", String(id)));
      if (args.projectId) (args.projectId as string[]).forEach((pid) => params.append("projectId", pid));
      if (args.onlyDefault !== undefined) params.set("onlyDefault", String(args.onlyDefault));
      if (args.expand) params.set("expand", args.expand as string);

      const result = await logger.time(
        "tool.list_notification_schemes",
        () => client.get(`/notificationscheme?${params}`),
        { tool: "list_notification_schemes" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_notification_scheme ───────────────────────────────────────────────
  server.registerTool(
    "get_notification_scheme",
    {
      title: "Get Notification Scheme",
      description:
        "Get details of a specific Jira notification scheme by ID. Returns the scheme name, description, and all notification events with their recipients (users, groups, roles, or special values like Reporter, Assignee, Project Lead).",
      inputSchema: {
        schemeId: z.number().int().describe("Notification scheme ID"),
        expand: z.string().optional().describe("Expand fields (e.g. all, field, group, notificationSchemeEvents, projectRole, user)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.get_notification_scheme",
        () => client.get(`/notificationscheme/${args.schemeId}${qs}`),
        { tool: "get_notification_scheme", schemeId: String(args.schemeId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
