// Audit Log tools: get_audit_records
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_audit_records ─────────────────────────────────────────────────────
  server.registerTool(
    "get_audit_records",
    {
      title: "Get Jira Audit Records",
      description:
        "Retrieve audit log records from the Jira instance. Returns a paginated list of audit events including creation, modification, and deletion of Jira entities. Filter by date range, text search, or category. Requires admin permissions.",
      inputSchema: {
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        limit: z.number().int().min(1).max(1000).optional().describe("Number of records to return (default 1000, max 1000)"),
        filter: z.string().optional().describe("Text filter string to search within audit records"),
        from: z.string().optional().describe("Start date/time in ISO 8601 format (e.g. 2024-01-01T00:00:00+00:00)"),
        to: z.string().optional().describe("End date/time in ISO 8601 format (e.g. 2024-12-31T23:59:59+00:00)"),
        projectIds: z.string().optional().describe("Comma-separated list of project IDs to filter by"),
        userIds: z.string().optional().describe("Comma-separated list of user account IDs to filter by"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.offset !== undefined) params.set("offset", String(args.offset));
      if (args.limit !== undefined) params.set("limit", String(args.limit));
      if (args.filter) params.set("filter", args.filter as string);
      if (args.from) params.set("from", args.from as string);
      if (args.to) params.set("to", args.to as string);
      if (args.projectIds) params.set("projectIds", args.projectIds as string);
      if (args.userIds) params.set("userIds", args.userIds as string);

      const result = await logger.time(
        "tool.get_audit_records",
        () => client.get(`/auditing/record?${params}`),
        { tool: "get_audit_records" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
