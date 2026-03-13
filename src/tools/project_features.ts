// Project Features tools: list_project_features, toggle_project_feature
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_project_features ─────────────────────────────────────────────────
  server.registerTool(
    "list_project_features",
    {
      title: "List Project Features",
      description:
        "List all features for a Jira project. Project features include things like Backlog, Sprints, Roadmap, and Releases. Returns feature state (enabled/disabled) and prerequisites.",
      inputSchema: {
        projectKey: z.string().describe("Project key (e.g. PROJ)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.list_project_features",
        () => client.get(`/project/${args.projectKey}/features`),
        { tool: "list_project_features", project: args.projectKey as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── toggle_project_feature ────────────────────────────────────────────────
  server.registerTool(
    "toggle_project_feature",
    {
      title: "Toggle Project Feature",
      description:
        "Enable or disable a specific feature for a Jira project. Features must be toggled one at a time. Some features have prerequisites that must be enabled first.",
      inputSchema: {
        projectKey: z.string().describe("Project key (e.g. PROJ)"),
        featureKey: z
          .string()
          .describe(
            "Feature key to toggle (e.g. 'jsw.agility.backlog', 'jsw.agility.sprints', 'jsw.classic.releases')"
          ),
        state: z.enum(["ENABLED", "DISABLED"]).describe("Target state for the feature"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.toggle_project_feature",
        () =>
          client.put(`/project/${args.projectKey}/features/${args.featureKey}`, {
            state: args.state,
          }),
        { tool: "toggle_project_feature", project: args.projectKey as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
