// Priorities tools: list_priorities, get_priority
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_priorities ────────────────────────────────────────────────────────
  server.registerTool(
    "list_priorities",
    {
      title: "List Issue Priorities",
      description:
        "List all issue priorities available in the Jira instance. Returns priority ID, name, description, icon URL, and status color. Use priority names when creating or updating issues.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
        id: z.array(z.string()).optional().describe("Filter by specific priority IDs"),
        onlyDefault: z.boolean().optional().describe("Return only the default priority"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.id) {
        (args.id as string[]).forEach((id) => params.append("id", id));
      }
      if (args.onlyDefault !== undefined) params.set("onlyDefault", String(args.onlyDefault));

      const result = await logger.time(
        "tool.list_priorities",
        () => client.get(`/priority/search?${params}`),
        { tool: "list_priorities" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_priority ───────────────────────────────────────────────────────────
  server.registerTool(
    "get_priority",
    {
      title: "Get Priority Details",
      description:
        "Get details for a specific issue priority by ID. Returns name, description, icon URL, and status color. Use list_priorities to find priority IDs.",
      inputSchema: {
        priorityId: z.string().describe("Priority ID (from list_priorities)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_priority",
        () => client.get(`/priority/${args.priorityId}`),
        { tool: "get_priority", priorityId: args.priorityId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
