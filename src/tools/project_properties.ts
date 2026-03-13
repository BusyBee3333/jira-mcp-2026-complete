// Project Properties tools: list_project_properties, get_project_property, set_project_property, delete_project_property
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_project_properties ───────────────────────────────────────────────
  server.registerTool(
    "list_project_properties",
    {
      title: "List Project Properties",
      description:
        "List all property keys for a Jira project. Project properties are key-value pairs attached to projects (used for add-on metadata). Returns array of property keys.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.list_project_properties",
        () => client.get(`/project/${args.projectKeyOrId}/properties`),
        { tool: "list_project_properties", project: args.projectKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_project_property ──────────────────────────────────────────────────
  server.registerTool(
    "get_project_property",
    {
      title: "Get Project Property",
      description: "Get the value of a specific property on a Jira project.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key or ID"),
        propertyKey: z.string().describe("Property key to retrieve"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_project_property",
        () => client.get(`/project/${args.projectKeyOrId}/properties/${args.propertyKey}`),
        { tool: "get_project_property", project: args.projectKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── set_project_property ──────────────────────────────────────────────────
  server.registerTool(
    "set_project_property",
    {
      title: "Set Project Property",
      description: "Create or update a property on a Jira project. Value can be any JSON-serializable data.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key or ID"),
        propertyKey: z.string().describe("Property key to set"),
        value: z.unknown().describe("JSON value to store"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.set_project_property",
        () => client.put(`/project/${args.projectKeyOrId}/properties/${args.propertyKey}`, args.value),
        { tool: "set_project_property", project: args.projectKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_project_property ───────────────────────────────────────────────
  server.registerTool(
    "delete_project_property",
    {
      title: "Delete Project Property",
      description: "Delete a specific property from a Jira project.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key or ID"),
        propertyKey: z.string().describe("Property key to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_project_property",
        () => client.delete(`/project/${args.projectKeyOrId}/properties/${args.propertyKey}`),
        { tool: "delete_project_property", project: args.projectKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
