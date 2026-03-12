// Projects tools: list_projects, get_project
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_projects ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_projects",
    {
      title: "List Jira Projects",
      description:
        "List all accessible Jira projects with key, name, type, and lead. Supports offset pagination (startAt, maxResults). Use when browsing available projects or finding a project key before querying issues.",
      inputSchema: {
        startAt: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Offset for pagination (default 0)"),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max results to return (default 50, max 100)"),
        query: z.string().optional().describe("Filter projects by name or key"),
        orderBy: z
          .enum(["category", "key", "name", "owner"])
          .optional()
          .describe("Sort field"),
        expand: z
          .string()
          .optional()
          .describe("Comma-separated expand fields (e.g. description,lead,url)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.startAt !== undefined) params.set("startAt", String(args.startAt));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.query) params.set("query", args.query);
      if (args.orderBy) params.set("orderBy", args.orderBy);
      if (args.expand) params.set("expand", args.expand);

      const result = await logger.time(
        "tool.list_projects",
        () => client.get(`/project/search?${params}`),
        { tool: "list_projects" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_project ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_project",
    {
      title: "Get Jira Project",
      description:
        "Get full details for a Jira project by key (e.g. 'PROJ') or ID. Returns name, description, lead, components, versions, and issue types. Use when you need project metadata before creating issues or exploring project structure.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID"),
        expand: z
          .string()
          .optional()
          .describe("Comma-separated expand fields (e.g. description,lead,issueTypes,versions)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.get_project",
        () => client.get(`/project/${args.projectKeyOrId}${qs}`),
        { tool: "get_project", project: args.projectKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
