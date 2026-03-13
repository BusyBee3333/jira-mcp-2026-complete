// Screens tools: list_screens, get_screen, list_screen_tabs, list_screen_tab_fields, add_field_to_screen
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_screens ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_screens",
    {
      title: "List Jira Screens",
      description:
        "List all screens in Jira. Screens define which fields are shown when creating, editing, or viewing issues. Returns screen ID, name, description, and scope.",
      inputSchema: {
        id: z.array(z.number()).optional().describe("Filter by screen IDs"),
        queryString: z.string().optional().describe("Filter screens by name"),
        scope: z.array(z.string()).optional().describe("Filter by scope (GLOBAL, TEMPLATE, PROJECT)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.queryString) params.set("queryString", args.queryString as string);
      if (args.id) (args.id as number[]).forEach((id) => params.append("id", String(id)));
      if (args.scope) (args.scope as string[]).forEach((s) => params.append("scope", s));

      const result = await logger.time(
        "tool.list_screens",
        () => client.get(`/screens?${params}`),
        { tool: "list_screens" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_screen ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_screen",
    {
      title: "Get Jira Screen",
      description:
        "Get details of a specific Jira screen by ID, including its name, description, and associated tabs.",
      inputSchema: {
        screenId: z.number().int().describe("Screen ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_screen",
        () => client.get(`/screens/${args.screenId}`),
        { tool: "get_screen", screenId: String(args.screenId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_screen_tabs ──────────────────────────────────────────────────────
  server.registerTool(
    "list_screen_tabs",
    {
      title: "List Screen Tabs",
      description:
        "List all tabs for a specific Jira screen. Tabs organize fields into logical sections. Returns tab ID, name, and position.",
      inputSchema: {
        screenId: z.number().int().describe("Screen ID"),
        projectKey: z.string().optional().describe("Project key to filter tabs for a specific project context"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.projectKey) params.set("projectKey", args.projectKey as string);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.list_screen_tabs",
        () => client.get(`/screens/${args.screenId}/tabs${qs}`),
        { tool: "list_screen_tabs", screenId: String(args.screenId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { tabs: result } as Record<string, unknown>,
      };
    }
  );

  // ── list_screen_tab_fields ────────────────────────────────────────────────
  server.registerTool(
    "list_screen_tab_fields",
    {
      title: "List Fields on Screen Tab",
      description:
        "List all fields on a specific tab of a Jira screen. Returns field ID, name, type, and whether it is required or hidden.",
      inputSchema: {
        screenId: z.number().int().describe("Screen ID"),
        tabId: z.number().int().describe("Tab ID"),
        projectKey: z.string().optional().describe("Project key for project-scoped context"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.projectKey) params.set("projectKey", args.projectKey as string);

      const result = await logger.time(
        "tool.list_screen_tab_fields",
        () => client.get(`/screens/${args.screenId}/tabs/${args.tabId}/fields?${params}`),
        { tool: "list_screen_tab_fields", screenId: String(args.screenId), tabId: String(args.tabId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_field_to_screen ───────────────────────────────────────────────────
  server.registerTool(
    "add_field_to_screen",
    {
      title: "Add Field to Screen Tab",
      description:
        "Add a field to a tab on a Jira screen. Use list_fields to get field IDs. This makes the field available on the specified screen form (create/edit/view).",
      inputSchema: {
        screenId: z.number().int().describe("Screen ID"),
        tabId: z.number().int().describe("Tab ID"),
        fieldId: z.string().describe("Field ID to add (e.g. 'customfield_10000', 'summary')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.add_field_to_screen",
        () => client.post(`/screens/${args.screenId}/tabs/${args.tabId}/fields`, { fieldId: args.fieldId }),
        { tool: "add_field_to_screen", screenId: String(args.screenId), tabId: String(args.tabId), fieldId: args.fieldId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
