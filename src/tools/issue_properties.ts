// Issue Properties tools: list_issue_properties, get_issue_property, set_issue_property, delete_issue_property
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_issue_properties ─────────────────────────────────────────────────
  server.registerTool(
    "list_issue_properties",
    {
      title: "List Issue Properties",
      description:
        "List all property keys for a Jira issue. Issue properties are key-value data attached to issues. Returns an array of property key strings.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.list_issue_properties",
        () => client.get(`/issue/${args.issueKeyOrId}/properties`),
        { tool: "list_issue_properties", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_issue_property ────────────────────────────────────────────────────
  server.registerTool(
    "get_issue_property",
    {
      title: "Get Issue Property",
      description: "Get the value of a specific property on a Jira issue by property key.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        propertyKey: z.string().describe("The property key to retrieve"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_issue_property",
        () => client.get(`/issue/${args.issueKeyOrId}/properties/${args.propertyKey}`),
        { tool: "get_issue_property", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── set_issue_property ────────────────────────────────────────────────────
  server.registerTool(
    "set_issue_property",
    {
      title: "Set Issue Property",
      description: "Set (create or update) a property on a Jira issue. Value can be any JSON-serializable data.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        propertyKey: z.string().describe("The property key to set"),
        value: z.unknown().describe("The JSON value to store (object, array, string, number, or boolean)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.set_issue_property",
        () => client.put(`/issue/${args.issueKeyOrId}/properties/${args.propertyKey}`, args.value),
        { tool: "set_issue_property", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_issue_property ─────────────────────────────────────────────────
  server.registerTool(
    "delete_issue_property",
    {
      title: "Delete Issue Property",
      description: "Delete a specific property from a Jira issue.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        propertyKey: z.string().describe("The property key to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_issue_property",
        () => client.delete(`/issue/${args.issueKeyOrId}/properties/${args.propertyKey}`),
        { tool: "delete_issue_property", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
