// Issue Type Schemes tools: list_issue_type_schemes, get_issue_type_scheme, create_issue_type_scheme, update_issue_type_scheme, delete_issue_type_scheme, list_issue_type_scheme_items, list_projects_for_issue_type_scheme, assign_issue_type_scheme_to_project
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_issue_type_schemes ───────────────────────────────────────────────
  server.registerTool(
    "list_issue_type_schemes",
    {
      title: "List Issue Type Schemes",
      description:
        "List all issue type schemes in Jira. Issue type schemes define which issue types are available in a project. Returns scheme ID, name, description, default issue type, and issue type list.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
        id: z.array(z.number().int()).optional().describe("Filter by scheme IDs"),
        queryString: z.string().optional().describe("Filter by name"),
        orderBy: z
          .enum(["name", "-name", "id", "-id"])
          .optional()
          .describe("Sort order"),
        expand: z.string().optional().describe("Expand fields (e.g. 'issueTypes')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.id) args.id.forEach((i) => params.append("id", String(i)));
      if (args.queryString) params.set("queryString", args.queryString as string);
      if (args.orderBy) params.set("orderBy", args.orderBy as string);
      if (args.expand) params.set("expand", args.expand as string);
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

  // ── create_issue_type_scheme ──────────────────────────────────────────────
  server.registerTool(
    "create_issue_type_scheme",
    {
      title: "Create Issue Type Scheme",
      description: "Create a new issue type scheme with a specified set of issue types.",
      inputSchema: {
        name: z.string().describe("Name for the new issue type scheme"),
        description: z.string().optional().describe("Description"),
        defaultIssueTypeId: z.string().optional().describe("Default issue type ID for the scheme"),
        issueTypeIds: z.array(z.string()).describe("Array of issue type IDs to include in the scheme"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = {
        name: args.name,
        issueTypeIds: args.issueTypeIds,
      };
      if (args.description) payload.description = args.description;
      if (args.defaultIssueTypeId) payload.defaultIssueTypeId = args.defaultIssueTypeId;
      const result = await logger.time(
        "tool.create_issue_type_scheme",
        () => client.post("/issuetypescheme", payload),
        { tool: "create_issue_type_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_issue_type_scheme ──────────────────────────────────────────────
  server.registerTool(
    "update_issue_type_scheme",
    {
      title: "Update Issue Type Scheme",
      description: "Update the name, description, or default issue type of an issue type scheme.",
      inputSchema: {
        issueTypeSchemeId: z.number().int().describe("Issue type scheme ID"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("New description"),
        defaultIssueTypeId: z.string().optional().describe("New default issue type ID"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = {};
      if (args.name) payload.name = args.name;
      if (args.description !== undefined) payload.description = args.description;
      if (args.defaultIssueTypeId) payload.defaultIssueTypeId = args.defaultIssueTypeId;
      const result = await logger.time(
        "tool.update_issue_type_scheme",
        () => client.put(`/issuetypescheme/${args.issueTypeSchemeId}`, payload),
        { tool: "update_issue_type_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_issue_type_scheme ──────────────────────────────────────────────
  server.registerTool(
    "delete_issue_type_scheme",
    {
      title: "Delete Issue Type Scheme",
      description: "Delete an issue type scheme. Projects using this scheme will be moved to the default scheme.",
      inputSchema: {
        issueTypeSchemeId: z.number().int().describe("Issue type scheme ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_issue_type_scheme",
        () => client.delete(`/issuetypescheme/${args.issueTypeSchemeId}`),
        { tool: "delete_issue_type_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_issue_type_scheme_items ──────────────────────────────────────────
  server.registerTool(
    "list_issue_type_scheme_items",
    {
      title: "List Issue Type Scheme Items",
      description:
        "List the issue type scheme mappings: which issue types belong to which scheme. Can filter by scheme IDs.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
        issueTypeSchemeId: z.array(z.number().int()).optional().describe("Filter by scheme IDs"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.issueTypeSchemeId) args.issueTypeSchemeId.forEach((i) => params.append("issueTypeSchemeId", String(i)));
      const result = await logger.time(
        "tool.list_issue_type_scheme_items",
        () => client.get(`/issuetypescheme/mapping?${params}`),
        { tool: "list_issue_type_scheme_items" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_projects_for_issue_type_scheme ───────────────────────────────────
  server.registerTool(
    "list_projects_for_issue_type_scheme",
    {
      title: "List Projects for Issue Type Scheme",
      description:
        "List the projects that use a specific issue type scheme.",
      inputSchema: {
        issueTypeSchemeId: z.array(z.number().int()).describe("Issue type scheme IDs to query"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      args.issueTypeSchemeId.forEach((i) => params.append("issueTypeSchemeId", String(i)));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      const result = await logger.time(
        "tool.list_projects_for_issue_type_scheme",
        () => client.get(`/issuetypescheme/project?${params}`),
        { tool: "list_projects_for_issue_type_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── assign_issue_type_scheme_to_project ───────────────────────────────────
  server.registerTool(
    "assign_issue_type_scheme_to_project",
    {
      title: "Assign Issue Type Scheme to Project",
      description: "Assign an issue type scheme to a project. This changes the available issue types for the project.",
      inputSchema: {
        projectId: z.string().describe("Project ID"),
        issueTypeSchemeId: z.string().describe("Issue type scheme ID to assign"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.assign_issue_type_scheme_to_project",
        () => client.put("/issuetypescheme/project", { projectId: args.projectId, issueTypeSchemeId: args.issueTypeSchemeId }),
        { tool: "assign_issue_type_scheme_to_project" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
