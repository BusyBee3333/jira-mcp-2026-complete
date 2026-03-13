// Jira Plans (Advanced Roadmaps) tools: list_plans, get_plan, create_plan,
// update_plan, delete_plan, get_plan_teams, get_plan_issue_sources,
// get_plan_sprint_mappings, list_plan_cross_project_releases
// Uses Jira Plans REST API v1 (/rest/plans/1.0)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_plans ────────────────────────────────────────────────────────────
  server.registerTool(
    "list_plans",
    {
      title: "List Jira Plans (Advanced Roadmaps)",
      description:
        "List all Jira Plans (Advanced Roadmaps) accessible to the current user. Returns plan ID, name, status, and issue counts. Requires Jira Premium or Enterprise.",
      inputSchema: {
        cursor: z.string().optional().describe("Pagination cursor from previous response"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 20, max 50)"),
        archived: z.boolean().optional().describe("Include archived plans (default: false)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.cursor) params.set("cursor", args.cursor as string);
      if (args.maxResults) params.set("maxResults", String(args.maxResults));
      if (args.archived !== undefined) params.set("archived", String(args.archived));

      const result = await logger.time(
        "tool.list_plans",
        () => client.get(`/rest/plans/1.0/plan?${params}`),
        { tool: "list_plans" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_plan ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_plan",
    {
      title: "Get Jira Plan",
      description:
        "Retrieve details of a specific Jira Plan (Advanced Roadmap) by ID. Returns the plan name, issue sources, schedule configuration, teams, and cross-project releases.",
      inputSchema: {
        planId: z.number().int().describe("Plan ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_plan",
        () => client.get(`/rest/plans/1.0/plan/${args.planId}`),
        { tool: "get_plan" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_plan ───────────────────────────────────────────────────────────
  server.registerTool(
    "create_plan",
    {
      title: "Create Jira Plan",
      description:
        "Create a new Jira Plan (Advanced Roadmap). Configure the plan name, issue sources (projects, boards, filters), and scheduling settings.",
      inputSchema: {
        name: z.string().describe("Plan name"),
        issueSources: z
          .array(
            z.object({
              type: z
                .enum(["Board", "Project", "Filter"])
                .describe("Source type: Board, Project, or Filter"),
              value: z.number().int().describe("ID of the board, project, or filter"),
            })
          )
          .min(1)
          .describe("Issue sources for the plan"),
        schedulingType: z
          .enum(["TeamCapacity", "StoryPoints", "DaysEstimate", "Velocity"])
          .optional()
          .describe("Scheduling algorithm to use"),
        exclusionRules: z
          .object({
            numOfWeeksToRelease: z
              .number()
              .int()
              .optional()
              .describe("Exclude issues released more than N weeks ago"),
          })
          .optional()
          .describe("Rules for excluding issues from the plan"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        name: args.name,
        issueSources: args.issueSources,
      };
      if (args.schedulingType) body.schedulingType = args.schedulingType;
      if (args.exclusionRules) body.exclusionRules = args.exclusionRules;

      const result = await logger.time(
        "tool.create_plan",
        () => client.post("/rest/plans/1.0/plan", body),
        { tool: "create_plan" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_plan ───────────────────────────────────────────────────────────
  server.registerTool(
    "update_plan",
    {
      title: "Update Jira Plan",
      description: "Update a Jira Plan's name or configuration.",
      inputSchema: {
        planId: z.number().int().describe("Plan ID"),
        name: z.string().optional().describe("New plan name"),
        schedulingType: z
          .enum(["TeamCapacity", "StoryPoints", "DaysEstimate", "Velocity"])
          .optional()
          .describe("New scheduling type"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.schedulingType) body.schedulingType = args.schedulingType;

      const result = await logger.time(
        "tool.update_plan",
        () => client.put(`/rest/plans/1.0/plan/${args.planId}`, body),
        { tool: "update_plan" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_plan ───────────────────────────────────────────────────────────
  server.registerTool(
    "delete_plan",
    {
      title: "Delete Jira Plan",
      description:
        "Delete a Jira Plan (Advanced Roadmap). This permanently removes the plan and its configuration. Issues referenced by the plan are not deleted.",
      inputSchema: {
        planId: z.number().int().describe("Plan ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_plan",
        () => client.delete(`/rest/plans/1.0/plan/${args.planId}`),
        { tool: "delete_plan" }
      );
      return {
        content: [{ type: "text" as const, text: `Plan ${args.planId} deleted successfully.` }],
      };
    }
  );

  // ── get_plan_teams ────────────────────────────────────────────────────────
  server.registerTool(
    "get_plan_teams",
    {
      title: "Get Jira Plan Teams",
      description:
        "List all teams configured in a Jira Plan. Returns team names, members, and capacity settings.",
      inputSchema: {
        planId: z.number().int().describe("Plan ID"),
        cursor: z.string().optional().describe("Pagination cursor"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.cursor) params.set("cursor", args.cursor as string);
      if (args.maxResults) params.set("maxResults", String(args.maxResults));

      const result = await logger.time(
        "tool.get_plan_teams",
        () => client.get(`/rest/plans/1.0/plan/${args.planId}/team?${params}`),
        { tool: "get_plan_teams" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_plan_cross_project_releases ───────────────────────────────────────
  server.registerTool(
    "get_plan_cross_project_releases",
    {
      title: "Get Plan Cross-Project Releases",
      description:
        "Retrieve cross-project releases (milestones) for a Jira Plan. Cross-project releases group multiple project versions into a single release milestone.",
      inputSchema: {
        planId: z.number().int().describe("Plan ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_plan_cross_project_releases",
        () =>
          client.get(`/rest/plans/1.0/plan/${args.planId}/crossprojectrelease`),
        { tool: "get_plan_cross_project_releases" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── archive_plan ──────────────────────────────────────────────────────────
  server.registerTool(
    "archive_plan",
    {
      title: "Archive Jira Plan",
      description:
        "Archive a Jira Plan (Advanced Roadmap). Archived plans are hidden from the default view but can be restored.",
      inputSchema: {
        planId: z.number().int().describe("Plan ID to archive"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.archive_plan",
        () =>
          client.request(`/rest/plans/1.0/plan/${args.planId}/archive`, {
            method: "POST",
            body: JSON.stringify({}),
          }),
        { tool: "archive_plan" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : `Plan ${args.planId} archived.`,
          },
        ],
      };
    }
  );
}
