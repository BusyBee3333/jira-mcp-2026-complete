// JSM Customer Requests tools: create_customer_request, get_customer_request,
// list_customer_requests, add_request_comment, get_request_transitions,
// transition_customer_request, get_request_approvals, approve_request
// Uses Jira Service Management REST API: /rest/servicedeskapi/
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── create_customer_request ───────────────────────────────────────────────
  server.registerTool(
    "create_customer_request",
    {
      title: "Create Customer Request (JSM)",
      description:
        "Create a new customer request in a Jira Service Management portal. The request type determines the required fields. Returns the created issue key and request details.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
        requestTypeId: z.string().describe("Request type ID (from list_request_types)"),
        summary: z.string().describe("Summary / title of the request"),
        description: z.string().optional().describe("Detailed description of the request"),
        requestFieldValues: z
          .record(z.unknown())
          .optional()
          .describe("Additional field values as key-value pairs (field ID → value)"),
        raiseOnBehalfOf: z
          .string()
          .optional()
          .describe("Account ID of the customer to raise the request on behalf of"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        serviceDeskId: args.serviceDeskId,
        requestTypeId: args.requestTypeId,
        requestFieldValues: {
          summary: args.summary,
          ...(args.description ? { description: args.description } : {}),
          ...(args.requestFieldValues ?? {}),
        },
      };
      if (args.raiseOnBehalfOf) body.raiseOnBehalfOf = args.raiseOnBehalfOf;

      const result = await logger.time(
        "tool.create_customer_request",
        () =>
          client.request("/servicedeskapi/request", {
            method: "POST",
            body: JSON.stringify(body),
          }),
        { tool: "create_customer_request" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_customer_request ──────────────────────────────────────────────────
  server.registerTool(
    "get_customer_request",
    {
      title: "Get Customer Request (JSM)",
      description:
        "Retrieve details of a specific JSM customer request by its issue key or ID. Returns request fields, status, participants, and SLA information.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID of the customer request"),
        expand: z
          .array(z.enum(["serviceDesk", "requestType", "participant", "sla", "status"]))
          .optional()
          .describe("Additional data to expand in the response"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", (args.expand as string[]).join(","));

      const result = await logger.time(
        "tool.get_customer_request",
        () =>
          client.request(
            `/servicedeskapi/request/${args.issueKeyOrId}?${params}`,
            { method: "GET" }
          ),
        { tool: "get_customer_request" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_customer_requests ────────────────────────────────────────────────
  server.registerTool(
    "list_customer_requests",
    {
      title: "List Customer Requests (JSM)",
      description:
        "List customer requests for the current user or all requests accessible by the agent. Supports filtering by status, service desk, and request type.",
      inputSchema: {
        serviceDeskId: z.string().optional().describe("Filter by service desk ID"),
        requestTypeId: z.string().optional().describe("Filter by request type ID"),
        requestStatus: z
          .enum(["OPEN_REQUESTS", "CLOSED_REQUESTS", "ALL_REQUESTS"])
          .optional()
          .describe("Filter by request status group (default: OPEN_REQUESTS)"),
        approvalStatus: z
          .enum(["MY_PENDING_APPROVAL", "ALL_PENDING_APPROVAL"])
          .optional()
          .describe("Filter by approval status"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.serviceDeskId) params.set("serviceDeskId", args.serviceDeskId as string);
      if (args.requestTypeId) params.set("requestTypeId", args.requestTypeId as string);
      if (args.requestStatus) params.set("requestStatus", args.requestStatus as string);
      if (args.approvalStatus) params.set("approvalStatus", args.approvalStatus as string);
      params.set("start", String(args.startAt ?? 0));
      params.set("limit", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.list_customer_requests",
        () =>
          client.request(`/servicedeskapi/request?${params}`, { method: "GET" }),
        { tool: "list_customer_requests" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_request_transitions ───────────────────────────────────────────────
  server.registerTool(
    "get_request_transitions",
    {
      title: "Get Request Transitions (JSM)",
      description:
        "List the available transitions for a customer request. Returns transition IDs and names that can be used with transition_customer_request.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID of the customer request"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_request_transitions",
        () =>
          client.request(
            `/servicedeskapi/request/${args.issueKeyOrId}/transition`,
            { method: "GET" }
          ),
        { tool: "get_request_transitions" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── transition_customer_request ───────────────────────────────────────────
  server.registerTool(
    "transition_customer_request",
    {
      title: "Transition Customer Request (JSM)",
      description:
        "Apply a workflow transition to a customer request. Use get_request_transitions to find valid transition IDs. Optionally include a comment.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID"),
        transitionId: z.string().describe("Transition ID (from get_request_transitions)"),
        comment: z.string().optional().describe("Comment to add when transitioning"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = { id: args.transitionId };
      if (args.comment) body.additionalComment = { body: args.comment };

      const result = await logger.time(
        "tool.transition_customer_request",
        () =>
          client.request(`/servicedeskapi/request/${args.issueKeyOrId}/transition`, {
            method: "POST",
            body: JSON.stringify(body),
          }),
        { tool: "transition_customer_request" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Request transitioned successfully.",
          },
        ],
      };
    }
  );

  // ── get_request_approvals ─────────────────────────────────────────────────
  server.registerTool(
    "get_request_approvals",
    {
      title: "Get Request Approvals (JSM)",
      description:
        "List all approvals for a JSM customer request. Returns approvals with their status, approvers, and decisions.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID of the customer request"),
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
        "tool.get_request_approvals",
        () =>
          client.request(
            `/servicedeskapi/request/${args.issueKeyOrId}/approval?${params}`,
            { method: "GET" }
          ),
        { tool: "get_request_approvals" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── answer_request_approval ───────────────────────────────────────────────
  server.registerTool(
    "answer_request_approval",
    {
      title: "Answer Request Approval (JSM)",
      description:
        "Approve or decline a pending approval on a JSM customer request. The current user must be an approver on the approval.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID"),
        approvalId: z.number().int().describe("Approval ID (from get_request_approvals)"),
        decision: z.enum(["approve", "decline"]).describe("Decision: approve or decline"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.answer_request_approval",
        () =>
          client.request(
            `/servicedeskapi/request/${args.issueKeyOrId}/approval/${args.approvalId}`,
            {
              method: "POST",
              body: JSON.stringify({ decision: args.decision }),
            }
          ),
        { tool: "answer_request_approval" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_request_participant ───────────────────────────────────────────────
  server.registerTool(
    "add_request_participant",
    {
      title: "Add Request Participant (JSM)",
      description:
        "Add one or more users as participants (watchers/collaborators) to a JSM customer request. Participants receive notifications and can view the request.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID"),
        accountIds: z.array(z.string()).min(1).describe("List of account IDs to add as participants"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.add_request_participant",
        () =>
          client.request(`/servicedeskapi/request/${args.issueKeyOrId}/participant`, {
            method: "POST",
            body: JSON.stringify({ accountIds: args.accountIds }),
          }),
        { tool: "add_request_participant" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
