// Issue Types tools: list_issue_types, get_issue_type, create_issue_type, update_issue_type, list_issue_type_schemes
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_issue_types ──────────────────────────────────────────────────────
  server.registerTool(
    "list_issue_types",
    {
      title: "List Jira Issue Types",
      description:
        "List all issue types defined in the Jira instance. Returns issue type ID, name, description, icon URL, subtask flag, and hierarchy level. Use to discover available issue types before creating issues.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.list_issue_types",
        () => client.get(`/issuetype?${params}`),
        { tool: "list_issue_types" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { issueTypes: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_issue_type ────────────────────────────────────────────────────────
  server.registerTool(
    "get_issue_type",
    {
      title: "Get Jira Issue Type",
      description:
        "Get details of a specific Jira issue type by ID. Returns the issue type name, description, icon, subtask status, hierarchy level, and associated fields.",
      inputSchema: {
        issueTypeId: z.string().describe("Issue type ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_issue_type",
        () => client.get(`/issuetype/${args.issueTypeId}`),
        { tool: "get_issue_type", issueTypeId: args.issueTypeId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_issue_type ─────────────────────────────────────────────────────
  server.registerTool(
    "create_issue_type",
    {
      title: "Create Jira Issue Type",
      description:
        "Create a new Jira issue type. Specify a name, type (standard or subtask), and optional description and hierarchy level. Returns the created issue type details.",
      inputSchema: {
        name: z.string().describe("Issue type name (must be unique)"),
        type: z.enum(["standard", "subtask"]).optional().describe("Issue type category: standard or subtask (default: standard)"),
        description: z.string().optional().describe("Description of the issue type"),
        hierarchyLevel: z.number().int().optional().describe("Hierarchy level (0 = standard, -1 = subtask, positive = epics/above)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        name: args.name,
        type: args.type ?? "standard",
      };
      if (args.description) body.description = args.description;
      if (args.hierarchyLevel !== undefined) body.hierarchyLevel = args.hierarchyLevel;

      const result = await logger.time(
        "tool.create_issue_type",
        () => client.post("/issuetype", body),
        { tool: "create_issue_type", name: args.name as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_issue_type ─────────────────────────────────────────────────────
  server.registerTool(
    "update_issue_type",
    {
      title: "Update Jira Issue Type",
      description:
        "Update an existing Jira issue type's name or description. Returns the updated issue type details.",
      inputSchema: {
        issueTypeId: z.string().describe("Issue type ID to update"),
        name: z.string().optional().describe("New name for the issue type"),
        description: z.string().optional().describe("New description for the issue type"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;

      const result = await logger.time(
        "tool.update_issue_type",
        () => client.put(`/issuetype/${args.issueTypeId}`, body),
        { tool: "update_issue_type", issueTypeId: args.issueTypeId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_issue_type_schemes ───────────────────────────────────────────────
  server.registerTool(
    "list_issue_type_schemes",
    {
      title: "List Issue Type Schemes",
      description:
        "List all issue type schemes in the Jira instance. Issue type schemes define which issue types are available for a set of projects. Returns scheme ID, name, description, default issue type, and associated issue types.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
        id: z.array(z.number()).optional().describe("Filter by scheme IDs"),
        orderBy: z.enum(["name", "-name", "id", "-id"]).optional().describe("Sort order"),
        queryString: z.string().optional().describe("Filter schemes by name"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.id) (args.id as number[]).forEach((id) => params.append("id", String(id)));
      if (args.orderBy) params.set("orderBy", args.orderBy as string);
      if (args.queryString) params.set("queryString", args.queryString as string);

      const result = await logger.time(
        "tool.list_issue_type_schemes",
        () => client.get(`/issuetypescheme?${params}`),
        { tool: "list_issue_type_schemes" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
