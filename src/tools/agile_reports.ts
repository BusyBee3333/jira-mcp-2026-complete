// Agile Reports tools: get_velocity_report, get_burndown_report,
// get_sprint_report, get_cumulative_flow_diagram, get_epic_report
// Uses Jira Software Agile REST API v1 (/rest/agile/1.0) and Greenhopper API
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_velocity_report ───────────────────────────────────────────────────
  server.registerTool(
    "get_velocity_report",
    {
      title: "Get Velocity Report",
      description:
        "Retrieve the velocity report for a Jira Software Scrum board. Returns committed vs completed story points/issue counts for the last several sprints. Requires Jira Software.",
      inputSchema: {
        boardId: z.number().int().describe("Scrum board ID (from list_boards)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_velocity_report",
        () =>
          client.request(
            `/greenhopper/1.0/rapid/charts/velocity?rapidViewId=${args.boardId}`,
            { method: "GET" }
          ),
        { tool: "get_velocity_report", boardId: String(args.boardId) }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_sprint_report ─────────────────────────────────────────────────────
  server.registerTool(
    "get_sprint_report",
    {
      title: "Get Sprint Report",
      description:
        "Retrieve the sprint report for a specific sprint on a Scrum board. Returns completed issues, incomplete issues, issues removed during the sprint, and sprint stats including velocity and completion rate.",
      inputSchema: {
        boardId: z.number().int().describe("Scrum board ID"),
        sprintId: z.number().int().describe("Sprint ID (from list_sprints)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_sprint_report",
        () =>
          client.request(
            `/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId=${args.boardId}&sprintId=${args.sprintId}`,
            { method: "GET" }
          ),
        { tool: "get_sprint_report" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_burndown_report ───────────────────────────────────────────────────
  server.registerTool(
    "get_burndown_report",
    {
      title: "Get Burndown Chart Data",
      description:
        "Retrieve the burndown chart data for a specific sprint. Returns the ideal burndown line and the actual burndown line with timestamped data points.",
      inputSchema: {
        boardId: z.number().int().describe("Scrum board ID"),
        sprintId: z.number().int().describe("Sprint ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_burndown_report",
        () =>
          client.request(
            `/greenhopper/1.0/rapid/charts/scopechangeburndownchart?rapidViewId=${args.boardId}&sprintId=${args.sprintId}`,
            { method: "GET" }
          ),
        { tool: "get_burndown_report" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_cumulative_flow ───────────────────────────────────────────────────
  server.registerTool(
    "get_cumulative_flow",
    {
      title: "Get Cumulative Flow Diagram Data",
      description:
        "Retrieve cumulative flow diagram (CFD) data for a board. Returns the number of issues in each column/status per day over a time range. Useful for identifying bottlenecks.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID (Scrum or Kanban)"),
        columnIds: z
          .array(z.number().int())
          .optional()
          .describe("Filter to specific column IDs (leave empty for all columns)"),
        fromDate: z
          .string()
          .optional()
          .describe("Start date in YYYY-MM-DD format (default: 3 months ago)"),
        toDate: z
          .string()
          .optional()
          .describe("End date in YYYY-MM-DD format (default: today)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("rapidViewId", String(args.boardId));
      if (args.fromDate) params.set("fromDate", args.fromDate as string);
      if (args.toDate) params.set("toDate", args.toDate as string);
      if (args.columnIds) {
        for (const id of args.columnIds as number[]) params.append("columnId", String(id));
      }

      const result = await logger.time(
        "tool.get_cumulative_flow",
        () =>
          client.request(
            `/greenhopper/1.0/rapid/charts/cumulativeflow?${params}`,
            { method: "GET" }
          ),
        { tool: "get_cumulative_flow", boardId: String(args.boardId) }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_epic_report ───────────────────────────────────────────────────────
  server.registerTool(
    "get_epic_report",
    {
      title: "Get Epic Report",
      description:
        "Retrieve the epic report for a specific board and epic. Shows completed, incomplete, and not-estimated issue breakdown within the epic along with points progress.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID"),
        epicKey: z.string().describe("Epic issue key (e.g. PROJ-5)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_epic_report",
        () =>
          client.request(
            `/greenhopper/1.0/rapid/charts/epicreport?rapidViewId=${args.boardId}&epicKey=${args.epicKey}`,
            { method: "GET" }
          ),
        { tool: "get_epic_report" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_version_report ────────────────────────────────────────────────────
  server.registerTool(
    "get_version_report",
    {
      title: "Get Version / Release Report",
      description:
        "Retrieve the version/release report for a board and version. Shows issues on track, completed, and at risk. Includes predicted release date based on velocity.",
      inputSchema: {
        boardId: z.number().int().describe("Board ID"),
        versionId: z.number().int().describe("Version ID (from list_versions)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_version_report",
        () =>
          client.request(
            `/greenhopper/1.0/rapid/charts/versionreport?rapidViewId=${args.boardId}&versionId=${args.versionId}`,
            { method: "GET" }
          ),
        { tool: "get_version_report" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
