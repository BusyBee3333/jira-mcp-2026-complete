// Time Tracking Configuration tools: get_time_tracking_config, list_time_tracking_providers, select_time_tracking_provider, disable_time_tracking, update_time_tracking_config
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_time_tracking_config ──────────────────────────────────────────────
  server.registerTool(
    "get_time_tracking_config",
    {
      title: "Get Time Tracking Configuration",
      description:
        "Get the time tracking configuration for the Jira instance: working hours per day, working days per week, default time unit, and time format.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.get_time_tracking_config",
        () => client.get("/configuration/timetracking/options"),
        { tool: "get_time_tracking_config" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_time_tracking_config ───────────────────────────────────────────
  server.registerTool(
    "update_time_tracking_config",
    {
      title: "Update Time Tracking Configuration",
      description:
        "Update the time tracking settings: working hours per day, working days per week, default time unit (minute/hour/day/week), and time format (pretty/days, hours).",
      inputSchema: {
        workingHoursPerDay: z.number().min(1).max(24).optional().describe("Working hours per day (e.g. 8)"),
        workingDaysPerWeek: z.number().min(1).max(7).optional().describe("Working days per week (e.g. 5)"),
        timeFormat: z
          .enum(["pretty", "days", "hours"])
          .optional()
          .describe("Time display format"),
        defaultUnit: z
          .enum(["minute", "hour", "day", "week"])
          .optional()
          .describe("Default time unit for time tracking"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = {};
      if (args.workingHoursPerDay !== undefined) payload.workingHoursPerDay = args.workingHoursPerDay;
      if (args.workingDaysPerWeek !== undefined) payload.workingDaysPerWeek = args.workingDaysPerWeek;
      if (args.timeFormat) payload.timeFormat = args.timeFormat;
      if (args.defaultUnit) payload.defaultUnit = args.defaultUnit;
      const result = await logger.time(
        "tool.update_time_tracking_config",
        () => client.put("/configuration/timetracking/options", payload),
        { tool: "update_time_tracking_config" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_time_tracking_providers ──────────────────────────────────────────
  server.registerTool(
    "list_time_tracking_providers",
    {
      title: "List Time Tracking Providers",
      description:
        "List all available time tracking providers in Jira. Returns provider ID, name, and URL. Includes the built-in JIRA provider and any installed add-on providers.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.list_time_tracking_providers",
        () => client.get("/configuration/timetracking"),
        { tool: "list_time_tracking_providers" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { providers: result } as Record<string, unknown>,
      };
    }
  );

  // ── select_time_tracking_provider ─────────────────────────────────────────
  server.registerTool(
    "select_time_tracking_provider",
    {
      title: "Select Time Tracking Provider",
      description: "Activate a time tracking provider. Use 'JIRA' for the built-in provider.",
      inputSchema: {
        providerId: z.string().describe("Provider ID to activate (e.g. 'JIRA')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.select_time_tracking_provider",
        () => client.put("/configuration/timetracking", { key: args.providerId }),
        { tool: "select_time_tracking_provider" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── disable_time_tracking ─────────────────────────────────────────────────
  server.registerTool(
    "disable_time_tracking",
    {
      title: "Disable Time Tracking",
      description: "Disable time tracking in Jira. Removes the time tracking panel from issues.",
      inputSchema: {},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.disable_time_tracking",
        () => client.delete("/configuration/timetracking"),
        { tool: "disable_time_tracking" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
