// Project Types tools: list_project_types, get_project_type, get_accessible_project_types, get_project_type_by_key
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_project_types ────────────────────────────────────────────────────
  server.registerTool(
    "list_project_types",
    {
      title: "List Project Types",
      description:
        "List all project types available in the Jira instance. Common types: software (Jira Software), business (Jira Work Management), service_desk (Jira Service Management). Returns key, formatted key, description, and icon.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.list_project_types",
        () => client.get("/project/type"),
        { tool: "list_project_types" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { projectTypes: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_accessible_project_types ──────────────────────────────────────────
  server.registerTool(
    "get_accessible_project_types",
    {
      title: "Get Accessible Project Types",
      description:
        "List project types that the current user has license access to and can create projects in.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.get_accessible_project_types",
        () => client.get("/project/type/accessible"),
        { tool: "get_accessible_project_types" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { projectTypes: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_project_type_by_key ───────────────────────────────────────────────
  server.registerTool(
    "get_project_type_by_key",
    {
      title: "Get Project Type by Key",
      description: "Get details of a specific project type by its key (e.g. 'software', 'business', 'service_desk').",
      inputSchema: {
        projectTypeKey: z
          .enum(["software", "business", "service_desk"])
          .describe("Project type key"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_project_type_by_key",
        () => client.get(`/project/type/${args.projectTypeKey}`),
        { tool: "get_project_type_by_key" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
