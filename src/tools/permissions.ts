// Permissions tools: list_permission_schemes, get_permission_scheme, list_my_permissions
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_permission_schemes ───────────────────────────────────────────────
  server.registerTool(
    "list_permission_schemes",
    {
      title: "List Permission Schemes",
      description:
        "List all permission schemes in the Jira instance. Permission schemes define which users or groups have which permissions within projects. Returns scheme ID, name, description, and expand info.",
      inputSchema: {
        expand: z.string().optional().describe("Expand fields (e.g. permissions,user,group,projectRole,field,all)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.list_permission_schemes",
        () => client.get(`/permissionscheme${qs}`),
        { tool: "list_permission_schemes" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_permission_scheme ─────────────────────────────────────────────────
  server.registerTool(
    "get_permission_scheme",
    {
      title: "Get Permission Scheme",
      description:
        "Get full details of a specific Jira permission scheme by ID. Returns the scheme name, description, and all defined permissions including the permission key, holder type, and holder values.",
      inputSchema: {
        schemeId: z.number().int().describe("Permission scheme ID"),
        expand: z.string().optional().describe("Expand fields (e.g. permissions,user,group,projectRole,field,all)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.get_permission_scheme",
        () => client.get(`/permissionscheme/${args.schemeId}${qs}`),
        { tool: "get_permission_scheme", schemeId: String(args.schemeId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_my_permissions ───────────────────────────────────────────────────
  server.registerTool(
    "list_my_permissions",
    {
      title: "List My Jira Permissions",
      description:
        "Get all permissions for the currently authenticated user, optionally scoped to a project or issue. Returns each permission key and whether the user has it. Useful for checking what actions a user can perform.",
      inputSchema: {
        projectKey: z.string().optional().describe("Project key to scope permissions check (e.g. PROJ)"),
        projectId: z.string().optional().describe("Project ID to scope permissions check"),
        issueKey: z.string().optional().describe("Issue key to scope permissions check (e.g. PROJ-123)"),
        issueId: z.string().optional().describe("Issue ID to scope permissions check"),
        permissions: z.string().optional().describe("Comma-separated list of permission keys to check (e.g. BROWSE_PROJECTS,CREATE_ISSUES)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.projectKey) params.set("projectKey", args.projectKey as string);
      if (args.projectId) params.set("projectId", args.projectId as string);
      if (args.issueKey) params.set("issueKey", args.issueKey as string);
      if (args.issueId) params.set("issueId", args.issueId as string);
      if (args.permissions) params.set("permissions", args.permissions as string);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.list_my_permissions",
        () => client.get(`/mypermissions${qs}`),
        { tool: "list_my_permissions" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
