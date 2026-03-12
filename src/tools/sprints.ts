// Sprints & Boards tools: list_boards, list_sprints, get_sprint
// Uses Jira Software Agile REST API v1 (/rest/agile/1.0)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_boards ────────────────────────────────────────────────────────────
  server.registerTool(
    "list_boards",
    {
      title: "List Jira Boards",
      description:
        "List all Jira Software boards (Scrum and Kanban). Returns board ID, name, type, and project. Use board IDs to call list_sprints. Requires Jira Software license.",
      inputSchema: {
        projectKeyOrId: z.string().optional().describe("Filter boards by project key or ID"),
        type: z
          .enum(["scrum", "kanban", "simple"])
          .optional()
          .describe("Filter by board type"),
        name: z.string().optional().describe("Filter by board name (partial match)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.projectKeyOrId) params.set("projectKeyOrId", args.projectKeyOrId as string);
      if (args.type) params.set("type", args.type as string);
      if (args.name) params.set("name", args.name as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.list_boards",
        () => client.request(`/agile/1.0/board?${params}`, { method: "GET" }),
        { tool: "list_boards" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_sprints ───────────────────────────────────────────────────────────
  server.registerTool(
    "list_sprints",
    {
      title: "List Sprints for Board",
      description:
        "List all sprints for a Jira Software Scrum board. Returns sprint ID, name, state (active/closed/future), start and end dates, and goal. Requires a board ID from list_boards.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID (from list_boards)"),
        state: z
          .enum(["active", "closed", "future"])
          .optional()
          .describe("Filter by sprint state"),
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
        "tool.list_sprints",
        () => client.request(`/agile/1.0/board/${args.boardId}/sprint?${params}`, { method: "GET" }),
        { tool: "list_sprints", boardId: String(args.boardId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_sprint ─────────────────────────────────────────────────────────────
  server.registerTool(
    "get_sprint",
    {
      title: "Get Sprint Details",
      description:
        "Get full details for a specific sprint: name, state (active/closed/future), start/end/complete dates, and sprint goal. Use list_sprints to find sprint IDs first.",
      inputSchema: {
        sprintId: z.number().int().describe("Sprint ID (from list_sprints)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_sprint",
        () => client.request(`/agile/1.0/sprint/${args.sprintId}`, { method: "GET" }),
        { tool: "get_sprint", sprintId: String(args.sprintId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
