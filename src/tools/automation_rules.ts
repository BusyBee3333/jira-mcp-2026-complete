// Automation Rules tools: list_automation_rules, get_automation_rule,
// enable_automation_rule, disable_automation_rule, execute_automation_rule,
// get_automation_audit_log, delete_automation_rule
// Uses Jira Automation REST API (/rest/cb-automation/latest or /rest/automation/internal)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_automation_rules ─────────────────────────────────────────────────
  server.registerTool(
    "list_automation_rules",
    {
      title: "List Automation Rules",
      description:
        "List all automation rules in the Jira instance. Returns rule ID, name, state (enabled/disabled), trigger type, project scope, and last execution info. Requires Jira Automation (cloud).",
      inputSchema: {
        projectKey: z
          .string()
          .optional()
          .describe("Filter rules by project key (omit for global/all-project rules)"),
        types: z
          .array(z.string())
          .optional()
          .describe("Filter by rule types (e.g. ['SCHEDULED', 'WEBHOOK', 'ISSUE'])"),
        status: z
          .enum(["ENABLED", "DISABLED"])
          .optional()
          .describe("Filter by rule status"),
        maxResults: z.number().int().min(1).max(1000).optional().describe("Maximum results (default 100)"),
        offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.projectKey) params.set("projectKey", args.projectKey as string);
      if (args.status) params.set("status", args.status as string);
      params.set("maxResults", String(args.maxResults ?? 100));
      params.set("offset", String(args.offset ?? 0));

      const result = await logger.time(
        "tool.list_automation_rules",
        () =>
          client.request(`/automation/internal-api/jira/rules?${params}`, { method: "GET" }),
        { tool: "list_automation_rules" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_automation_rule ───────────────────────────────────────────────────
  server.registerTool(
    "get_automation_rule",
    {
      title: "Get Automation Rule",
      description:
        "Retrieve the full details of a specific automation rule by ID, including trigger configuration, conditions, and actions.",
      inputSchema: {
        ruleId: z.number().int().describe("Automation rule ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_automation_rule",
        () =>
          client.request(`/automation/internal-api/jira/rules/${args.ruleId}`, { method: "GET" }),
        { tool: "get_automation_rule" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── enable_automation_rule ────────────────────────────────────────────────
  server.registerTool(
    "enable_automation_rule",
    {
      title: "Enable Automation Rule",
      description:
        "Enable a disabled automation rule so it will execute on matching trigger events.",
      inputSchema: {
        ruleId: z.number().int().describe("Automation rule ID to enable"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.enable_automation_rule",
        () =>
          client.request(`/automation/internal-api/jira/rules/${args.ruleId}/enable`, {
            method: "PUT",
            body: JSON.stringify({}),
          }),
        { tool: "enable_automation_rule" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : `Rule ${args.ruleId} enabled.`,
          },
        ],
      };
    }
  );

  // ── disable_automation_rule ───────────────────────────────────────────────
  server.registerTool(
    "disable_automation_rule",
    {
      title: "Disable Automation Rule",
      description:
        "Disable an active automation rule. The rule will be preserved but will not execute until re-enabled.",
      inputSchema: {
        ruleId: z.number().int().describe("Automation rule ID to disable"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.disable_automation_rule",
        () =>
          client.request(`/automation/internal-api/jira/rules/${args.ruleId}/disable`, {
            method: "PUT",
            body: JSON.stringify({}),
          }),
        { tool: "disable_automation_rule" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : `Rule ${args.ruleId} disabled.`,
          },
        ],
      };
    }
  );

  // ── execute_automation_rule ───────────────────────────────────────────────
  server.registerTool(
    "execute_automation_rule",
    {
      title: "Execute Automation Rule",
      description:
        "Manually trigger an automation rule. The rule must be enabled and support manual execution. Returns the execution ID that can be used to check status.",
      inputSchema: {
        ruleId: z.number().int().describe("Automation rule ID"),
        issues: z
          .array(z.string())
          .optional()
          .describe("Issue keys to execute the rule against (for issue-scoped rules)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.issues) body.issues = (args.issues as string[]).map((key) => ({ key }));

      const result = await logger.time(
        "tool.execute_automation_rule",
        () =>
          client.request(`/automation/internal-api/jira/rules/${args.ruleId}/execute`, {
            method: "POST",
            body: JSON.stringify(body),
          }),
        { tool: "execute_automation_rule" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_automation_audit_log ──────────────────────────────────────────────
  server.registerTool(
    "get_automation_audit_log",
    {
      title: "Get Automation Audit Log",
      description:
        "Retrieve the audit log for automation rule executions. Returns execution records with status (success/failed), issue affected, trigger, and timestamps.",
      inputSchema: {
        ruleId: z.number().int().optional().describe("Filter by specific rule ID (omit for all rules)"),
        status: z
          .enum(["SUCCESS", "FAILED", "INVALID"])
          .optional()
          .describe("Filter by execution status"),
        maxResults: z.number().int().min(1).max(1000).optional().describe("Max results (default 100)"),
        offset: z.number().int().min(0).optional().describe("Pagination offset"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.ruleId) params.set("ruleId", String(args.ruleId));
      if (args.status) params.set("status", args.status as string);
      params.set("maxResults", String(args.maxResults ?? 100));
      params.set("offset", String(args.offset ?? 0));

      const result = await logger.time(
        "tool.get_automation_audit_log",
        () =>
          client.request(`/automation/internal-api/jira/executions?${params}`, { method: "GET" }),
        { tool: "get_automation_audit_log" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
