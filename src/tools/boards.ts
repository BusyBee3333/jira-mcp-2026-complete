// Boards tools: get_board, get_board_configuration, list_board_sprints
// Note: list_boards already exists in sprints.ts
// Uses Jira Software Agile REST API v1 (/rest/agile/1.0)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_board ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_board",
    {
      title: "Get Board Details",
      description:
        "Get full details for a specific Jira Software board by ID. Returns board name, type (scrum/kanban), and associated project. Use list_boards to find board IDs.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID (from list_boards)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_board",
        () => client.request(`/agile/1.0/board/${args.boardId}`, { method: "GET" }),
        { tool: "get_board", boardId: String(args.boardId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_board_configuration ────────────────────────────────────────────────
  server.registerTool(
    "get_board_configuration",
    {
      title: "Get Board Configuration",
      description:
        "Get the configuration for a Jira Software board. Returns column mappings, swimlane strategy, and working days for Scrum boards or Kanban boards.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID (from list_boards)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_board_configuration",
        () => client.request(`/agile/1.0/board/${args.boardId}/configuration`, { method: "GET" }),
        { tool: "get_board_configuration", boardId: String(args.boardId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_board_sprints ─────────────────────────────────────────────────────
  server.registerTool(
    "list_board_sprints",
    {
      title: "List Sprints for Board",
      description:
        "List sprints associated with a Jira Software Scrum board. Returns sprint ID, name, state (active/closed/future), start date, end date, and sprint goal. Supports filtering by state and pagination.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID (from list_boards)"),
        state: z
          .enum(["active", "closed", "future"])
          .optional()
          .describe("Filter by sprint state: active, closed, or future"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.state) params.set("state", args.state as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.list_board_sprints",
        () => client.request(`/agile/1.0/board/${args.boardId}/sprint?${params}`, { method: "GET" }),
        { tool: "list_board_sprints", boardId: String(args.boardId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
