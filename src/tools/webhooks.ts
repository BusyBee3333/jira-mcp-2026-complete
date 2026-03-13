// Webhooks tools: list_webhooks, register_webhooks, delete_webhooks, get_failed_webhooks, refresh_webhooks, list_dynamic_webhooks, delete_dynamic_webhook
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_webhooks ─────────────────────────────────────────────────────────
  server.registerTool(
    "list_webhooks",
    {
      title: "List Dynamic Webhooks",
      description:
        "List all dynamic webhooks registered for the current application/integration. Returns ID, URL, events, JQL filter, expiration date, and state for each webhook.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 100)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 100));
      const result = await logger.time(
        "tool.list_webhooks",
        () => client.get(`/webhook?${params}`),
        { tool: "list_webhooks" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── register_webhooks ─────────────────────────────────────────────────────
  server.registerTool(
    "register_webhooks",
    {
      title: "Register Webhooks",
      description:
        "Register one or more dynamic webhooks. Each webhook specifies a URL, JQL filter for which issues to watch, and events to subscribe to. Webhooks expire after 30 days unless refreshed.",
      inputSchema: {
        url: z.string().url().describe("URL that will receive webhook POST requests"),
        webhooks: z
          .array(
            z.object({
              jqlFilter: z.string().describe("JQL filter for issues that trigger this webhook (use '' for all)"),
              events: z
                .array(
                  z.enum([
                    "jira:issue_created",
                    "jira:issue_updated",
                    "jira:issue_deleted",
                    "comment_created",
                    "comment_updated",
                    "comment_deleted",
                    "issue_property_set",
                    "issue_property_deleted",
                  ])
                )
                .describe("Events to subscribe to"),
            })
          )
          .describe("Webhook definitions — each can have its own JQL filter and event list"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.register_webhooks",
        () => client.post("/webhook", { url: args.url, webhooks: args.webhooks }),
        { tool: "register_webhooks" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_webhooks ───────────────────────────────────────────────────────
  server.registerTool(
    "delete_webhooks",
    {
      title: "Delete Webhooks",
      description: "Delete one or more dynamic webhooks by their IDs.",
      inputSchema: {
        webhookIds: z.array(z.number().int()).describe("Array of webhook IDs to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_webhooks",
        () => client.delete(`/webhook?${args.webhookIds.map((id) => `webhookId=${id}`).join("&")}`),
        { tool: "delete_webhooks" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_failed_webhooks ───────────────────────────────────────────────────
  server.registerTool(
    "get_failed_webhooks",
    {
      title: "Get Failed Webhooks",
      description:
        "Get a list of webhooks that failed to deliver (HTTP error or timeout). Returns webhook ID, event, URL, failure count, and last failure time.",
      inputSchema: {
        maxResults: z.number().int().min(1).max(100).optional().describe("Max results (default 100)"),
        after: z.number().int().optional().describe("Timestamp in ms to get failures after this time"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.maxResults) params.set("maxResults", String(args.maxResults));
      if (args.after !== undefined) params.set("after", String(args.after));
      const result = await logger.time(
        "tool.get_failed_webhooks",
        () => client.get(`/webhook/failed?${params}`),
        { tool: "get_failed_webhooks" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── refresh_webhooks ──────────────────────────────────────────────────────
  server.registerTool(
    "refresh_webhooks",
    {
      title: "Refresh Webhooks",
      description:
        "Extend the expiration date of dynamic webhooks by 30 days. Pass webhook IDs to refresh. Webhooks that are not refreshed will expire after their initial 30-day period.",
      inputSchema: {
        webhookIds: z.array(z.number().int()).describe("Array of webhook IDs to refresh"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.refresh_webhooks",
        () => client.put("/webhook/refresh", { webhookIds: args.webhookIds }),
        { tool: "refresh_webhooks" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
