// Epic Management tools: create_epic, get_epic_issues, move_issues_to_epic,
// remove_issues_from_epic, get_epic_by_key, update_epic_rank
// Uses Jira Software Agile REST API v1 (/rest/agile/1.0)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_agile_epic ────────────────────────────────────────────────────────
  server.registerTool(
    "get_agile_epic",
    {
      title: "Get Agile Epic",
      description:
        "Retrieve a single epic from the Agile API by issue key or ID. Returns epic summary, status, colour, and done flag.",
      inputSchema: {
        epicKeyOrId: z.string().describe("Epic issue key (e.g. PROJ-5) or agile epic ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_agile_epic",
        () => client.request(`/agile/1.0/epic/${args.epicKeyOrId}`, { method: "GET" }),
        { tool: "get_agile_epic" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_agile_epic ─────────────────────────────────────────────────────
  server.registerTool(
    "update_agile_epic",
    {
      title: "Update Agile Epic",
      description:
        "Update an epic's name, summary, or done status via the Agile API. Set done=true to mark an epic complete.",
      inputSchema: {
        epicKeyOrId: z.string().describe("Epic issue key or ID"),
        name: z.string().optional().describe("New epic name (short label)"),
        summary: z.string().optional().describe("New epic summary"),
        done: z.boolean().optional().describe("Mark the epic as done (true) or in-progress (false)"),
        color: z.object({ key: z.string() }).optional().describe("Colour object e.g. {key: 'color_1'}"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name !== undefined) body.name = args.name;
      if (args.summary !== undefined) body.summary = args.summary;
      if (args.done !== undefined) body.done = args.done;
      if (args.color !== undefined) body.color = args.color;

      const result = await logger.time(
        "tool.update_agile_epic",
        () =>
          client.request(`/agile/1.0/epic/${args.epicKeyOrId}`, {
            method: "POST",
            body: JSON.stringify(body),
          }),
        { tool: "update_agile_epic" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_agile_epic_issues ─────────────────────────────────────────────────
  server.registerTool(
    "get_agile_epic_issues",
    {
      title: "Get Issues in Agile Epic",
      description:
        "List all issues that belong to a specific epic. Returns issue keys, summaries, status, and assignee. Paginated.",
      inputSchema: {
        epicKeyOrId: z.string().describe("Epic key (e.g. PROJ-5) or agile epic ID"),
        jql: z.string().optional().describe("Additional JQL to further filter issues"),
        fields: z.array(z.string()).optional().describe("Fields to include in results"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
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
        "tool.get_agile_epic_issues",
        () =>
          client.request(`/agile/1.0/epic/${args.epicKeyOrId}/issue?${params}`, { method: "GET" }),
        { tool: "get_agile_epic_issues" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── move_issues_to_agile_epic ─────────────────────────────────────────────
  server.registerTool(
    "move_issues_to_agile_epic",
    {
      title: "Move Issues to Agile Epic",
      description:
        "Assign a list of issues to an epic via the Agile API. Overwrites any existing epic link on the specified issues.",
      inputSchema: {
        epicKeyOrId: z.string().describe("Target epic key (e.g. PROJ-5) or epic ID"),
        issues: z.array(z.string()).min(1).describe("Issue keys or IDs to move into the epic"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.move_issues_to_agile_epic",
        () =>
          client.request(`/agile/1.0/epic/${args.epicKeyOrId}/issue`, {
            method: "POST",
            body: JSON.stringify({ issues: args.issues }),
          }),
        { tool: "move_issues_to_agile_epic" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Issues moved to epic successfully.",
          },
        ],
      };
    }
  );

  // ── remove_issues_from_epic ───────────────────────────────────────────────
  server.registerTool(
    "remove_issues_from_epic",
    {
      title: "Remove Issues from Epic",
      description:
        "Detach issues from their current epic, moving them back to the 'no epic' state. Useful for re-organisation of work.",
      inputSchema: {
        issues: z.array(z.string()).min(1).describe("Issue keys or IDs to remove from their epic"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.remove_issues_from_epic",
        () =>
          client.request("/agile/1.0/epic/none/issue", {
            method: "POST",
            body: JSON.stringify({ issues: args.issues }),
          }),
        { tool: "remove_issues_from_epic" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Issues removed from epic successfully.",
          },
        ],
      };
    }
  );

  // ── rank_epic_before ──────────────────────────────────────────────────────
  server.registerTool(
    "rank_epic_before",
    {
      title: "Rank Epic Before Another Epic",
      description:
        "Move an epic so it appears directly before another epic in the backlog ranking order.",
      inputSchema: {
        epicKeyOrId: z.string().describe("Epic to re-rank"),
        rankBeforeEpic: z.string().describe("Epic key or ID that this epic should appear before"),
        rankCustomFieldId: z.number().int().optional().describe("Custom rank field ID (optional)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = { rankBeforeEpic: args.rankBeforeEpic };
      if (args.rankCustomFieldId !== undefined) body.rankCustomFieldId = args.rankCustomFieldId;

      const result = await logger.time(
        "tool.rank_epic_before",
        () =>
          client.request(`/agile/1.0/epic/${args.epicKeyOrId}/rank`, {
            method: "PUT",
            body: JSON.stringify(body),
          }),
        { tool: "rank_epic_before" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Epic ranked successfully.",
          },
        ],
      };
    }
  );
}
