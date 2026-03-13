// Worklogs tools: list_worklogs, add_worklog, update_worklog, delete_worklog
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_worklogs ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_worklogs",
    {
      title: "List Issue Worklogs",
      description:
        "List all worklogs (time tracking entries) for a Jira issue. Returns worklog ID, author, time spent, started date, and comment. Use add_worklog to log work.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
        startedAfter: z.number().optional().describe("Filter worklogs started after this timestamp (milliseconds)"),
        startedBefore: z.number().optional().describe("Filter worklogs started before this timestamp (milliseconds)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.startedAfter !== undefined) params.set("startedAfter", String(args.startedAfter));
      if (args.startedBefore !== undefined) params.set("startedBefore", String(args.startedBefore));

      const result = await logger.time(
        "tool.list_worklogs",
        () => client.get(`/issue/${args.issueKeyOrId}/worklog?${params}`),
        { tool: "list_worklogs", issue: args.issueKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_worklog ────────────────────────────────────────────────────────────
  server.registerTool(
    "add_worklog",
    {
      title: "Add Worklog to Issue",
      description:
        "Log time worked on a Jira issue. Requires timeSpent (e.g. '2h 30m', '1d', '45m') and optionally a started date and comment. Returns the new worklog ID.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        timeSpent: z.string().describe("Time spent in Jira duration format (e.g. '2h 30m', '1d', '45m')"),
        comment: z.string().optional().describe("Comment describing the work done"),
        started: z
          .string()
          .optional()
          .describe("When work started, ISO 8601 datetime (default: now). E.g. '2024-01-15T09:00:00.000+0000'"),
        adjustEstimate: z
          .enum(["new", "leave", "manual", "auto"])
          .optional()
          .describe("Adjust remaining estimate: 'auto' (default), 'new', 'leave', 'manual'"),
        newEstimate: z.string().optional().describe("New remaining estimate (used when adjustEstimate='new')"),
        reduceBy: z.string().optional().describe("Amount to reduce remaining estimate by (used when adjustEstimate='manual')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.adjustEstimate) params.set("adjustEstimate", args.adjustEstimate as string);
      if (args.newEstimate) params.set("newEstimate", args.newEstimate as string);
      if (args.reduceBy) params.set("reduceBy", args.reduceBy as string);
      const qs = params.toString() ? `?${params}` : "";

      const body: Record<string, unknown> = {
        timeSpent: args.timeSpent,
      };

      if (args.started) {
        body.started = args.started;
      }

      if (args.comment) {
        body.comment = {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: args.comment }] }],
        };
      }

      const result = await logger.time(
        "tool.add_worklog",
        () => client.post(`/issue/${args.issueKeyOrId}/worklog${qs}`, body),
        { tool: "add_worklog", issue: args.issueKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_worklog ─────────────────────────────────────────────────────────
  server.registerTool(
    "update_worklog",
    {
      title: "Update Worklog",
      description:
        "Update an existing worklog entry on a Jira issue. You can change the time spent, comment, and started date. Use list_worklogs to find worklog IDs.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        worklogId: z.string().describe("Worklog ID (from list_worklogs)"),
        timeSpent: z.string().optional().describe("New time spent (e.g. '3h', '1d 2h')"),
        comment: z.string().optional().describe("New comment text"),
        started: z.string().optional().describe("New started datetime (ISO 8601)"),
        adjustEstimate: z
          .enum(["new", "leave", "manual", "auto"])
          .optional()
          .describe("How to adjust the remaining estimate"),
        newEstimate: z.string().optional().describe("New remaining estimate (when adjustEstimate='new')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.adjustEstimate) params.set("adjustEstimate", args.adjustEstimate as string);
      if (args.newEstimate) params.set("newEstimate", args.newEstimate as string);
      const qs = params.toString() ? `?${params}` : "";

      const body: Record<string, unknown> = {};
      if (args.timeSpent) body.timeSpent = args.timeSpent;
      if (args.started) body.started = args.started;
      if (args.comment) {
        body.comment = {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: args.comment }] }],
        };
      }

      const result = await logger.time(
        "tool.update_worklog",
        () => client.put(`/issue/${args.issueKeyOrId}/worklog/${args.worklogId}${qs}`, body),
        { tool: "update_worklog", issue: args.issueKeyOrId as string, worklogId: args.worklogId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_worklog ─────────────────────────────────────────────────────────
  server.registerTool(
    "delete_worklog",
    {
      title: "Delete Worklog",
      description:
        "Delete a worklog entry from a Jira issue. This action cannot be undone. Use list_worklogs to find worklog IDs.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        worklogId: z.string().describe("Worklog ID to delete (from list_worklogs)"),
        adjustEstimate: z
          .enum(["new", "leave", "manual", "auto"])
          .optional()
          .describe("How to adjust remaining estimate after deletion (default: auto)"),
        newEstimate: z.string().optional().describe("New remaining estimate (when adjustEstimate='new')"),
        increaseBy: z.string().optional().describe("Amount to increase estimate by (when adjustEstimate='manual')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.adjustEstimate) params.set("adjustEstimate", args.adjustEstimate as string);
      if (args.newEstimate) params.set("newEstimate", args.newEstimate as string);
      if (args.increaseBy) params.set("increaseBy", args.increaseBy as string);
      const qs = params.toString() ? `?${params}` : "";

      await logger.time(
        "tool.delete_worklog",
        () => client.delete(`/issue/${args.issueKeyOrId}/worklog/${args.worklogId}${qs}`),
        { tool: "delete_worklog", issue: args.issueKeyOrId as string, worklogId: args.worklogId as string }
      );

      const result = { success: true, issueKey: args.issueKeyOrId, worklogId: args.worklogId };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
