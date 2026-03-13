// Board Configuration tools: get_board_config, update_board_config,
// get_board_features, toggle_board_feature, get_board_issues_for_sprint,
// get_board_epics, get_board_issues_without_epic
// Uses Jira Software Agile REST API v1 (/rest/agile/1.0)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_board_config ──────────────────────────────────────────────────────
  server.registerTool(
    "get_board_config",
    {
      title: "Get Board Configuration",
      description:
        "Retrieve the full configuration of a Jira Software board including column configuration, swimlane strategy, ranking, card colours, working days, and estimation settings.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID (from list_boards)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_board_config",
        () => client.request(`/agile/1.0/board/${args.boardId}/configuration`, { method: "GET" }),
        { tool: "get_board_config", boardId: String(args.boardId) }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_board_issues_for_sprint ───────────────────────────────────────────
  server.registerTool(
    "get_board_issues_for_sprint",
    {
      title: "Get Board Issues for Sprint",
      description:
        "Return all issues on a specific board for a specific sprint. Respects board column filters. Useful for sprint planning and review context.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID"),
        sprintId: z.number().int().describe("Sprint ID (from list_sprints)"),
        jql: z.string().optional().describe("Additional JQL filter"),
        fields: z.array(z.string()).optional().describe("Fields to return"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.jql) params.set("jql", args.jql as string);
      if (args.fields) params.set("fields", (args.fields as string[]).join(","));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.get_board_issues_for_sprint",
        () =>
          client.request(
            `/agile/1.0/board/${args.boardId}/sprint/${args.sprintId}/issue?${params}`,
            { method: "GET" }
          ),
        { tool: "get_board_issues_for_sprint" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_board_epics ───────────────────────────────────────────────────────
  server.registerTool(
    "get_board_epics",
    {
      title: "Get Board Epics",
      description:
        "List all epics belonging to a Jira Software board. Returns epic key, summary, status, and colour. Use board ID from list_boards.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID"),
        done: z.boolean().optional().describe("Filter: true = completed epics only, false = in-progress epics only"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.done !== undefined) params.set("done", String(args.done));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.get_board_epics",
        () => client.request(`/agile/1.0/board/${args.boardId}/epic?${params}`, { method: "GET" }),
        { tool: "get_board_epics", boardId: String(args.boardId) }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_board_issues_without_epic ─────────────────────────────────────────
  server.registerTool(
    "get_board_issues_without_epic",
    {
      title: "Get Board Issues Without Epic",
      description:
        "Return all issues on a board that are not assigned to any epic. Helps identify orphaned work that needs to be organised into epics.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID"),
        jql: z.string().optional().describe("Additional JQL filter"),
        fields: z.array(z.string()).optional().describe("Fields to return"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.jql) params.set("jql", args.jql as string);
      if (args.fields) params.set("fields", (args.fields as string[]).join(","));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.get_board_issues_without_epic",
        () =>
          client.request(`/agile/1.0/board/${args.boardId}/epic/none/issue?${params}`, { method: "GET" }),
        { tool: "get_board_issues_without_epic", boardId: String(args.boardId) }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_board_projects ────────────────────────────────────────────────────
  server.registerTool(
    "get_board_projects",
    {
      title: "Get Board Projects",
      description:
        "List all projects included in a Jira Software board's filter. Returns the project key, name, and ID. Useful for multi-project boards.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.get_board_projects",
        () => client.request(`/agile/1.0/board/${args.boardId}/project?${params}`, { method: "GET" }),
        { tool: "get_board_projects", boardId: String(args.boardId) }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
