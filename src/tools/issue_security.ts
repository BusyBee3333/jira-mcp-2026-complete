// Issue Security tools: list_issue_security_schemes, get_issue_security_scheme, create_issue_security_scheme, update_issue_security_scheme, delete_issue_security_scheme, list_issue_security_levels, get_issue_security_level, set_issue_security
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_issue_security_schemes ───────────────────────────────────────────
  server.registerTool(
    "list_issue_security_schemes",
    {
      title: "List Issue Security Schemes",
      description:
        "List all issue security schemes in Jira. Issue security schemes restrict who can view or access issues. Returns ID, name, description, and default security level.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
        id: z.array(z.string()).optional().describe("Filter by scheme IDs"),
        projectId: z.array(z.string()).optional().describe("Filter schemes by project IDs"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.id) args.id.forEach((i) => params.append("id", i));
      if (args.projectId) args.projectId.forEach((p) => params.append("projectId", p));
      const result = await logger.time(
        "tool.list_issue_security_schemes",
        () => client.get(`/issuesecurityschemes?${params}`),
        { tool: "list_issue_security_schemes" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_issue_security_scheme ─────────────────────────────────────────────
  server.registerTool(
    "get_issue_security_scheme",
    {
      title: "Get Issue Security Scheme",
      description: "Get details of a specific issue security scheme including all its security levels.",
      inputSchema: {
        schemeId: z.number().int().describe("Issue security scheme ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_issue_security_scheme",
        () => client.get(`/issuesecurityschemes/${args.schemeId}`),
        { tool: "get_issue_security_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_issue_security_levels ────────────────────────────────────────────
  server.registerTool(
    "list_issue_security_levels",
    {
      title: "List Issue Security Levels",
      description:
        "List all security levels for a specific issue security scheme. Returns level ID, name, description, and whether it is the default level.",
      inputSchema: {
        schemeId: z.number().int().describe("Issue security scheme ID"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
        onlyDefault: z.boolean().optional().describe("Return only the default level (default false)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.onlyDefault !== undefined) params.set("onlyDefault", String(args.onlyDefault));
      const result = await logger.time(
        "tool.list_issue_security_levels",
        () => client.get(`/issuesecurityschemes/${args.schemeId}/members?${params}`),
        { tool: "list_issue_security_levels" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_issue_security_level ──────────────────────────────────────────────
  server.registerTool(
    "get_issue_security_level",
    {
      title: "Get Issue Security Level",
      description: "Get details of a specific security level by ID.",
      inputSchema: {
        securityLevelId: z.string().describe("Security level ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_issue_security_level",
        () => client.get(`/securitylevel/${args.securityLevelId}`),
        { tool: "get_issue_security_level" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_project_security_levels ──────────────────────────────────────────
  server.registerTool(
    "list_project_security_levels",
    {
      title: "List Project Security Levels",
      description:
        "List security levels available for a project. These are the levels that can be set on issues in the project.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key or ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.list_project_security_levels",
        () => client.get(`/project/${args.projectKeyOrId}/securitylevel`),
        { tool: "list_project_security_levels" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
