// Project Categories tools: list_project_categories, get_project_category, create_project_category, update_project_category, delete_project_category
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_project_categories ───────────────────────────────────────────────
  server.registerTool(
    "list_project_categories",
    {
      title: "List Project Categories",
      description:
        "List all project categories in Jira. Project categories are used to group related projects together. Returns ID, name, and description for each category.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.list_project_categories",
        () => client.get("/projectCategory"),
        { tool: "list_project_categories" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { categories: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_project_category ──────────────────────────────────────────────────
  server.registerTool(
    "get_project_category",
    {
      title: "Get Project Category",
      description: "Get details of a specific project category by ID.",
      inputSchema: {
        categoryId: z.string().describe("Project category ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_project_category",
        () => client.get(`/projectCategory/${args.categoryId}`),
        { tool: "get_project_category" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_project_category ───────────────────────────────────────────────
  server.registerTool(
    "create_project_category",
    {
      title: "Create Project Category",
      description: "Create a new project category in Jira.",
      inputSchema: {
        name: z.string().describe("Name for the new category"),
        description: z.string().optional().describe("Description of the category"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = { name: args.name };
      if (args.description) payload.description = args.description;
      const result = await logger.time(
        "tool.create_project_category",
        () => client.post("/projectCategory", payload),
        { tool: "create_project_category" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_project_category ───────────────────────────────────────────────
  server.registerTool(
    "update_project_category",
    {
      title: "Update Project Category",
      description: "Update the name or description of an existing project category.",
      inputSchema: {
        categoryId: z.string().describe("Project category ID"),
        name: z.string().optional().describe("New name for the category"),
        description: z.string().optional().describe("New description"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = {};
      if (args.name) payload.name = args.name;
      if (args.description) payload.description = args.description;
      const result = await logger.time(
        "tool.update_project_category",
        () => client.put(`/projectCategory/${args.categoryId}`, payload),
        { tool: "update_project_category" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_project_category ───────────────────────────────────────────────
  server.registerTool(
    "delete_project_category",
    {
      title: "Delete Project Category",
      description: "Delete a project category by ID. Projects in the category are not deleted.",
      inputSchema: {
        categoryId: z.string().describe("Project category ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_project_category",
        () => client.delete(`/projectCategory/${args.categoryId}`),
        { tool: "delete_project_category" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
