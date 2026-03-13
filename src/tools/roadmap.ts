// Roadmap / Epics tools: list_epics, get_epic, update_epic, list_epic_issues, move_issue_to_epic
// Uses Jira Software Agile REST API: /rest/agile/1.0/
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_epics ────────────────────────────────────────────────────────────
  server.registerTool(
    "list_epics",
    {
      title: "List Epics on Board",
      description:
        "List all epics on a Jira Software board. Returns epic key, name, summary, done status, and color. Epics appear on the roadmap and can contain multiple stories and tasks. Requires a board ID (use list_boards to find one).",
      inputSchema: {
        boardId: z.number().int().describe("Board ID (use list_boards to find board IDs)"),
        done: z.boolean().optional().describe("Filter by done status. true = done epics only, false = active epics only, omit = all"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.done !== undefined) params.set("done", String(args.done));

      const result = await logger.time(
        "tool.list_epics",
        () => client.get(`/agile/1.0/board/${args.boardId}/epic?${params}`),
        { tool: "list_epics", boardId: String(args.boardId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_epic ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_epic",
    {
      title: "Get Jira Epic",
      description:
        "Get details of a specific Jira Software epic by ID or key. Returns the epic's ID, key, name, summary, done status, and color label. Use to fetch epic metadata before listing its child issues.",
      inputSchema: {
        epicIdOrKey: z.string().describe("Epic ID (numeric) or epic issue key (e.g. PROJ-100)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_epic",
        () => client.get(`/agile/1.0/epic/${args.epicIdOrKey}`),
        { tool: "get_epic", epic: args.epicIdOrKey as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_epic ───────────────────────────────────────────────────────────
  server.registerTool(
    "update_epic",
    {
      title: "Update Jira Epic",
      description:
        "Update an existing Jira Software epic's name, summary, color, or done status. Use to rename epics, change their color on the roadmap, or mark them as done.",
      inputSchema: {
        epicIdOrKey: z.string().describe("Epic ID (numeric) or epic issue key (e.g. PROJ-100)"),
        name: z.string().optional().describe("New epic name (short label shown on the roadmap)"),
        summary: z.string().optional().describe("New epic summary"),
        color: z.object({
          key: z.enum([
            "color_1", "color_2", "color_3", "color_4", "color_5",
            "color_6", "color_7", "color_8", "color_9",
          ]).describe("Color key"),
        }).optional().describe("Epic color for roadmap visualization"),
        done: z.boolean().optional().describe("Mark the epic as done (true) or reopen it (false)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name !== undefined) body.name = args.name;
      if (args.summary !== undefined) body.summary = args.summary;
      if (args.color !== undefined) body.color = args.color;
      if (args.done !== undefined) body.done = args.done;

      const result = await logger.time(
        "tool.update_epic",
        () => client.post(`/agile/1.0/epic/${args.epicIdOrKey}`, body),
        { tool: "update_epic", epic: args.epicIdOrKey as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_epic_issues ──────────────────────────────────────────────────────
  server.registerTool(
    "list_epic_issues",
    {
      title: "List Issues in Epic",
      description:
        "List all issues (stories, tasks, bugs) that belong to a specific Jira Software epic. Returns issue key, summary, status, assignee, priority, and story points. Supports pagination.",
      inputSchema: {
        epicIdOrKey: z.string().describe("Epic ID or key (e.g. PROJ-100)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
        jql: z.string().optional().describe("Additional JQL to filter issues within the epic"),
        fields: z.array(z.string()).optional().describe("Fields to include in response"),
        expand: z.string().optional().describe("Expand fields (e.g. names,schema,renderedFields)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.jql) params.set("jql", args.jql as string);
      if (args.fields) params.set("fields", (args.fields as string[]).join(","));
      if (args.expand) params.set("expand", args.expand as string);

      const result = await logger.time(
        "tool.list_epic_issues",
        () => client.get(`/agile/1.0/epic/${args.epicIdOrKey}/issue?${params}`),
        { tool: "list_epic_issues", epic: args.epicIdOrKey as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── move_issue_to_epic ────────────────────────────────────────────────────
  server.registerTool(
    "move_issue_to_epic",
    {
      title: "Move Issues to Epic",
      description:
        "Move one or more Jira issues into an epic. The issues will be linked to the epic and appear in the epic's issue list and on the roadmap. Pass multiple issue keys to move them all at once.",
      inputSchema: {
        epicIdOrKey: z.string().describe("Target epic ID or key (e.g. PROJ-100)"),
        issueKeys: z.array(z.string()).min(1).describe("Array of issue keys to move into this epic (e.g. ['PROJ-1', 'PROJ-2'])"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body = { issues: args.issueKeys };

      await logger.time(
        "tool.move_issue_to_epic",
        () => client.post(`/agile/1.0/epic/${args.epicIdOrKey}/issue`, body),
        { tool: "move_issue_to_epic", epic: args.epicIdOrKey as string }
      );

      const result = {
        success: true,
        epicKey: args.epicIdOrKey,
        movedIssues: args.issueKeys,
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
