// Sprints & Boards tools: list_boards, list_sprints, get_sprint, update_sprint, close_sprint, move_issues_to_sprint
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

  // ── update_sprint ──────────────────────────────────────────────────────────
  server.registerTool(
    "update_sprint",
    {
      title: "Update Sprint",
      description:
        "Update sprint details such as name, goal, start date, or end date. Requires the sprint ID from list_sprints. Cannot change the sprint state via this tool — use close_sprint to close a sprint.",
      inputSchema: {
        sprintId: z.number().int().describe("Sprint ID (from list_sprints or get_sprint)"),
        name: z.string().optional().describe("New sprint name"),
        goal: z.string().optional().describe("New sprint goal"),
        startDate: z
          .string()
          .optional()
          .describe("New start date (ISO 8601, e.g. '2024-01-15T09:00:00.000Z')"),
        endDate: z
          .string()
          .optional()
          .describe("New end date / complete date (ISO 8601, e.g. '2024-01-29T17:00:00.000Z')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.goal !== undefined) body.goal = args.goal;
      if (args.startDate) body.startDate = args.startDate;
      if (args.endDate) body.endDate = args.endDate;

      const result = await logger.time(
        "tool.update_sprint",
        () => client.request(`/agile/1.0/sprint/${args.sprintId}`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
        { tool: "update_sprint", sprintId: String(args.sprintId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── close_sprint ───────────────────────────────────────────────────────────
  server.registerTool(
    "close_sprint",
    {
      title: "Close Sprint",
      description:
        "Close (complete) an active sprint. This marks the sprint as closed in Jira Software. Unfinished issues will remain in the project backlog. Use list_sprints with state='active' to find the active sprint ID.",
      inputSchema: {
        sprintId: z.number().int().describe("Sprint ID to close (must be in 'active' state)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body = { state: "closed" };

      const result = await logger.time(
        "tool.close_sprint",
        () => client.request(`/agile/1.0/sprint/${args.sprintId}`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
        { tool: "close_sprint", sprintId: String(args.sprintId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── move_issues_to_sprint ──────────────────────────────────────────────────
  server.registerTool(
    "move_issues_to_sprint",
    {
      title: "Move Issues to Sprint",
      description:
        "Move one or more issues to a specific sprint. Use list_sprints to find sprint IDs. Issues can be moved from any sprint or the backlog to the target sprint. Provide up to 50 issue keys per call.",
      inputSchema: {
        sprintId: z.number().int().describe("Target sprint ID (from list_sprints)"),
        issueKeys: z
          .array(z.string())
          .min(1)
          .max(50)
          .describe("Array of issue keys to move (e.g. ['PROJ-1', 'PROJ-2'])"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body = { issues: args.issueKeys };

      await logger.time(
        "tool.move_issues_to_sprint",
        () => client.request(`/agile/1.0/sprint/${args.sprintId}/issue`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
        { tool: "move_issues_to_sprint", sprintId: String(args.sprintId), count: String((args.issueKeys as string[]).length) }
      );

      const result = {
        success: true,
        sprintId: args.sprintId,
        movedIssues: args.issueKeys,
        count: (args.issueKeys as string[]).length,
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
