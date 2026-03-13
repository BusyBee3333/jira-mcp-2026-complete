// JSM Knowledge Base tools: list_kb_articles, search_kb_articles,
// list_kb_spaces, suggest_kb_articles_for_request
// Uses Jira Service Management REST API: /rest/servicedeskapi/
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── search_kb_articles ────────────────────────────────────────────────────
  server.registerTool(
    "search_kb_articles",
    {
      title: "Search JSM Knowledge Base Articles",
      description:
        "Search for knowledge base articles in a JSM service desk. Returns article title, excerpt, source URL, and status. Requires a Confluence license linked to Jira.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
        query: z.string().describe("Search query string"),
        highlight: z
          .boolean()
          .optional()
          .describe("Whether to include highlighted text in the response (default: false)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 10)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("query", args.query as string);
      if (args.highlight !== undefined) params.set("highlight", String(args.highlight));
      params.set("start", String(args.startAt ?? 0));
      params.set("limit", String(args.maxResults ?? 10));

      const result = await logger.time(
        "tool.search_kb_articles",
        () =>
          client.request(
            `/servicedeskapi/servicedesk/${args.serviceDeskId}/knowledgebase/article?${params}`,
            { method: "GET" }
          ),
        { tool: "search_kb_articles" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── suggest_kb_articles ───────────────────────────────────────────────────
  server.registerTool(
    "suggest_kb_articles",
    {
      title: "Suggest Knowledge Base Articles for Request Type (JSM)",
      description:
        "Get knowledge base article suggestions for a specific request type in a JSM portal. Used to surface self-service articles before a customer submits a request.",
      inputSchema: {
        portalId: z.number().int().describe("Portal ID"),
        requestTypeId: z.number().int().describe("Request type ID"),
        query: z.string().optional().describe("Optional query string to refine suggestions"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 10)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.query) params.set("query", args.query as string);
      params.set("start", String(args.startAt ?? 0));
      params.set("limit", String(args.maxResults ?? 10));

      const result = await logger.time(
        "tool.suggest_kb_articles",
        () =>
          client.request(
            `/servicedeskapi/portal/${args.portalId}/requesttype/${args.requestTypeId}/knowledgebase/article?${params}`,
            { method: "GET" }
          ),
        { tool: "suggest_kb_articles" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_request_type_fields ───────────────────────────────────────────────
  server.registerTool(
    "get_request_type_fields",
    {
      title: "Get Request Type Fields (JSM)",
      description:
        "Retrieve the list of fields for a specific JSM request type. Returns field IDs, names, required status, and valid values. Use this to understand what fields are required before creating a customer request.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
        requestTypeId: z.number().int().describe("Request type ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_request_type_fields",
        () =>
          client.request(
            `/servicedeskapi/servicedesk/${args.serviceDeskId}/requesttype/${args.requestTypeId}/field`,
            { method: "GET" }
          ),
        { tool: "get_request_type_fields" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_sla_information ───────────────────────────────────────────────────
  server.registerTool(
    "get_sla_information",
    {
      title: "Get SLA Information for Request (JSM)",
      description:
        "Retrieve the SLA (Service Level Agreement) information for a specific JSM customer request. Returns SLA name, completion status, breach time, and remaining time.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID of the customer request"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("start", String(args.startAt ?? 0));
      params.set("limit", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.get_sla_information",
        () =>
          client.request(
            `/servicedeskapi/request/${args.issueKeyOrId}/sla?${params}`,
            { method: "GET" }
          ),
        { tool: "get_sla_information" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_queue_statistics ──────────────────────────────────────────────────
  server.registerTool(
    "get_queue_statistics",
    {
      title: "Get JSM Queue Statistics",
      description:
        "Retrieve issue count statistics for all queues in a JSM service desk. Returns queue name, ID, and the number of issues currently in each queue.",
      inputSchema: {
        serviceDeskId: z.string().describe("Service desk ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_queue_statistics",
        () =>
          client.request(
            `/servicedeskapi/servicedesk/${args.serviceDeskId}/queue?includeCount=true`,
            { method: "GET" }
          ),
        { tool: "get_queue_statistics" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
