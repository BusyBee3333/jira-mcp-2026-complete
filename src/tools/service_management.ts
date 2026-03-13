// Service Management tools: list_service_desks, get_service_desk, list_request_types,
// list_queues, get_queue_issues, list_sla_info
// Uses Jira Service Management REST API: /rest/servicedeskapi/
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_service_desks ────────────────────────────────────────────────────
  server.registerTool(
    "list_service_desks",
    {
      title: "List Jira Service Desks",
      description:
        "List all Jira Service Management (JSM) service desks accessible to the current user. Returns service desk ID, project ID, project name, and key. Requires Jira Service Management.",
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
        "tool.list_service_desks",
        () => client.get(`/servicedeskapi/servicedesk?${params}`),
        { tool: "list_service_desks" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_service_desk ──────────────────────────────────────────────────────
  server.registerTool(
    "get_service_desk",
    {
      title: "Get Jira Service Desk",
      description:
        "Get details of a specific Jira Service Management service desk by ID. Returns service desk ID, project ID, project name, key, and available features.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID (numeric, e.g. '1')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_service_desk",
        () => client.get(`/servicedeskapi/servicedesk/${args.serviceDeskId}`),
        { tool: "get_service_desk", serviceDeskId: args.serviceDeskId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_request_types ────────────────────────────────────────────────────
  server.registerTool(
    "list_request_types",
    {
      title: "List Service Desk Request Types",
      description:
        "List all request types (issue types) available in a Jira Service Management service desk. Returns request type ID, name, description, and field groups.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
        groupId: z.number().int().optional().describe("Filter by group ID"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("start", String(args.startAt ?? 0));
      params.set("limit", String(args.maxResults ?? 50));
      if (args.groupId !== undefined) params.set("groupId", String(args.groupId));

      const result = await logger.time(
        "tool.list_request_types",
        () => client.get(`/servicedeskapi/servicedesk/${args.serviceDeskId}/requesttype?${params}`),
        { tool: "list_request_types", serviceDeskId: args.serviceDeskId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_queues ───────────────────────────────────────────────────────────
  server.registerTool(
    "list_queues",
    {
      title: "List Service Desk Queues",
      description:
        "List all queues in a Jira Service Management service desk. Returns queue ID, name, JQL query, and issue count. Queues organize issues by criteria like priority, SLA status, or assignment.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
        includeCount: z.boolean().optional().describe("Include the number of issues in each queue (default false)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("start", String(args.startAt ?? 0));
      params.set("limit", String(args.maxResults ?? 50));
      if (args.includeCount) params.set("includeCount", "true");

      const result = await logger.time(
        "tool.list_queues",
        () => client.get(`/servicedeskapi/servicedesk/${args.serviceDeskId}/queue?${params}`),
        { tool: "list_queues", serviceDeskId: args.serviceDeskId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_queue_issues ──────────────────────────────────────────────────────
  server.registerTool(
    "get_queue_issues",
    {
      title: "Get Issues in Service Desk Queue",
      description:
        "Get the list of issues in a specific Jira Service Management queue. Returns issue details including key, summary, status, priority, and SLA information.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
        queueId: z.string().describe("Queue ID"),
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
        "tool.get_queue_issues",
        () => client.get(`/servicedeskapi/servicedesk/${args.serviceDeskId}/queue/${args.queueId}/issue?${params}`),
        { tool: "get_queue_issues", serviceDeskId: args.serviceDeskId as string, queueId: args.queueId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_sla_info ─────────────────────────────────────────────────────────
  server.registerTool(
    "list_sla_info",
    {
      title: "List SLA Information for Issue",
      description:
        "Get Service Level Agreement (SLA) information for a specific Jira Service Management issue. Returns SLA name, elapsed time, remaining time, breached status, and completion timestamps.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. SD-123) or issue ID"),
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
        "tool.list_sla_info",
        () => client.get(`/servicedeskapi/request/${args.issueKeyOrId}/sla?${params}`),
        { tool: "list_sla_info", issue: args.issueKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
