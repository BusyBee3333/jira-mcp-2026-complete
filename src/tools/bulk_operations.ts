// Bulk Operations tools: bulk_edit_issues, bulk_transition_issues, bulk_watch_issues, bulk_unwatch_issues, bulk_get_issues, get_bulk_edit_fields
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_bulk_edit_fields ──────────────────────────────────────────────────
  server.registerTool(
    "get_bulk_edit_fields",
    {
      title: "Get Bulk Edit Fields",
      description:
        "Get the list of fields that can be bulk-edited for a given set of issues. Returns which fields are available for bulk editing and any restrictions.",
      inputSchema: {
        issueIds: z.array(z.number().int()).describe("List of issue IDs to get editable fields for"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      args.issueIds.forEach((id) => params.append("issueIdsOrKeys", String(id)));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      const result = await logger.time(
        "tool.get_bulk_edit_fields",
        () => client.get(`/bulk/issues/fields?${params}`),
        { tool: "get_bulk_edit_fields" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── bulk_edit_issues ──────────────────────────────────────────────────────
  server.registerTool(
    "bulk_edit_issues",
    {
      title: "Bulk Edit Issues",
      description:
        "Edit multiple Jira issues at once. Applies the same field updates to all specified issues. Returns an async task ID to track progress.",
      inputSchema: {
        issueIdsOrKeys: z.array(z.string()).describe("List of issue IDs or keys to edit"),
        fields: z
          .record(z.unknown())
          .describe(
            "Fields to update as key-value pairs (same format as update_issue). E.g. {\"assignee\": {\"accountId\": \"...\"}, \"priority\": {\"name\": \"High\"}}"
          ),
        sendBulkNotification: z.boolean().optional().describe("Send notifications to watchers (default true)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = {
        editedFieldsInput: { fields: args.fields },
        selectedActions: Object.keys(args.fields as Record<string, unknown>),
        selectedIssueIdsOrKeys: args.issueIdsOrKeys,
      };
      if (args.sendBulkNotification !== undefined) payload.sendBulkNotification = args.sendBulkNotification;
      const result = await logger.time(
        "tool.bulk_edit_issues",
        () => client.post("/bulk/issues/fields", payload),
        { tool: "bulk_edit_issues" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_bulk_transition_statuses ──────────────────────────────────────────
  server.registerTool(
    "get_bulk_transition_statuses",
    {
      title: "Get Bulk Transition Statuses",
      description:
        "Get available workflow transitions that can be applied in bulk to a set of issues.",
      inputSchema: {
        issueIdsOrKeys: z.array(z.string()).describe("List of issue IDs or keys"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      args.issueIdsOrKeys.forEach((id) => params.append("issueIdsOrKeys", id));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      const result = await logger.time(
        "tool.get_bulk_transition_statuses",
        () => client.get(`/bulk/issues/transition?${params}`),
        { tool: "get_bulk_transition_statuses" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── bulk_transition_issues ────────────────────────────────────────────────
  server.registerTool(
    "bulk_transition_issues",
    {
      title: "Bulk Transition Issues",
      description:
        "Transition multiple Jira issues to a new workflow status at once. Returns an async task ID to track progress.",
      inputSchema: {
        issueIdsOrKeys: z.array(z.string()).describe("List of issue IDs or keys to transition"),
        transitionId: z.string().describe("Transition ID to apply (get from get_bulk_transition_statuses)"),
        sendBulkNotification: z.boolean().optional().describe("Send notifications to watchers (default true)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = {
        selectedIssueIdsOrKeys: args.issueIdsOrKeys,
        transition: { id: args.transitionId },
      };
      if (args.sendBulkNotification !== undefined) payload.sendBulkNotification = args.sendBulkNotification;
      const result = await logger.time(
        "tool.bulk_transition_issues",
        () => client.post("/bulk/issues/transition", payload),
        { tool: "bulk_transition_issues" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── bulk_delete_issues ────────────────────────────────────────────────────
  server.registerTool(
    "bulk_delete_issues",
    {
      title: "Bulk Delete Issues",
      description:
        "Delete multiple Jira issues at once. This is irreversible. Returns an async task ID to track progress.",
      inputSchema: {
        issueIdsOrKeys: z.array(z.string()).describe("List of issue IDs or keys to delete"),
        sendBulkNotification: z.boolean().optional().describe("Send notifications to watchers (default false)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = {
        selectedIssueIdsOrKeys: args.issueIdsOrKeys,
      };
      if (args.sendBulkNotification !== undefined) payload.sendBulkNotification = args.sendBulkNotification;
      const result = await logger.time(
        "tool.bulk_delete_issues",
        () => client.delete(
          `/bulk/issues?${args.issueIdsOrKeys.map((k) => `issueIdsOrKeys=${encodeURIComponent(k)}`).join("&")}`
        ),
        { tool: "bulk_delete_issues" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
