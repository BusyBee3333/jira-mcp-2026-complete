// Comments tools: add_comment, list_comments
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_comments ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_comments",
    {
      title: "List Issue Comments",
      description:
        "List all comments on a Jira issue with pagination. Returns comment body, author, created date, and updated date. Use when the user wants to read the comment thread on an issue.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or ID"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
        orderBy: z
          .enum(["created", "-created"])
          .optional()
          .describe("Sort: 'created' (oldest first) or '-created' (newest first, default)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.orderBy) params.set("orderBy", args.orderBy as string);

      const result = await logger.time(
        "tool.list_comments",
        () => client.get(`/issue/${args.issueKeyOrId}/comment?${params}`),
        { tool: "list_comments", issue: args.issueKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_comment ────────────────────────────────────────────────────────────
  server.registerTool(
    "add_comment",
    {
      title: "Add Issue Comment",
      description:
        "Add a comment to a Jira issue. Plain text is automatically wrapped in Atlassian Document Format. Optionally restrict visibility to a specific role or group.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or ID"),
        body: z.string().describe("Comment text to add"),
        visibilityType: z
          .enum(["role", "group"])
          .optional()
          .describe("Visibility restriction type"),
        visibilityValue: z
          .string()
          .optional()
          .describe("Visibility restriction value (e.g. 'Service Desk Team')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = {
        body: {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: args.body }] }],
        },
      };
      if (args.visibilityType && args.visibilityValue) {
        payload.visibility = { type: args.visibilityType, value: args.visibilityValue };
      }

      const result = await logger.time(
        "tool.add_comment",
        () => client.post(`/issue/${args.issueKeyOrId}/comment`, payload),
        { tool: "add_comment", issue: args.issueKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
