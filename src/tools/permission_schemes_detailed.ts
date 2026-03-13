// Permission Schemes Detailed tools: create_permission_scheme,
// update_permission_scheme, delete_permission_scheme,
// list_permission_scheme_grants, get_permission_scheme_grant,
// create_permission_scheme_grant, delete_permission_scheme_grant,
// list_project_permission_scheme, assign_permission_scheme_to_project
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── create_permission_scheme ──────────────────────────────────────────────
  server.registerTool(
    "create_permission_scheme",
    {
      title: "Create Permission Scheme",
      description:
        "Create a new permission scheme. Permission schemes define which users/groups/roles have which permissions in projects that use the scheme.",
      inputSchema: {
        name: z.string().describe("Permission scheme name"),
        description: z.string().optional().describe("Description of the permission scheme"),
        permissions: z
          .array(
            z.object({
              permission: z
                .string()
                .describe("Permission key (e.g. 'BROWSE_PROJECTS', 'CREATE_ISSUES')"),
              holder: z
                .object({
                  type: z
                    .string()
                    .describe(
                      "Holder type: 'anyone', 'applicationRole', 'assignee', 'group', 'groupCustomField', 'projectLead', 'projectRole', 'reporter', 'sd.customer.portal.only', 'user', 'userCustomField'"
                    ),
                  parameter: z
                    .string()
                    .optional()
                    .describe("Holder parameter (e.g. group name, role ID, user account ID)"),
                })
                .describe("Who holds this permission"),
            })
          )
          .optional()
          .describe("Initial permission grants"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = { name: args.name };
      if (args.description) body.description = args.description;
      if (args.permissions) body.permissions = args.permissions;

      const result = await logger.time(
        "tool.create_permission_scheme",
        () =>
          client.post("/rest/api/3/permissionscheme", body),
        { tool: "create_permission_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_permission_scheme ──────────────────────────────────────────────
  server.registerTool(
    "update_permission_scheme",
    {
      title: "Update Permission Scheme",
      description:
        "Update a permission scheme's name, description, and/or permission grants. Note: this replaces all existing grants with the provided ones.",
      inputSchema: {
        schemeId: z.number().int().describe("Permission scheme ID"),
        name: z.string().optional().describe("New scheme name"),
        description: z.string().optional().describe("New description"),
        permissions: z
          .array(
            z.object({
              permission: z.string().describe("Permission key"),
              holder: z.object({
                type: z.string(),
                parameter: z.string().optional(),
              }),
            })
          )
          .optional()
          .describe("Complete replacement list of permissions (replaces existing grants)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;
      if (args.permissions) body.permissions = args.permissions;

      const result = await logger.time(
        "tool.update_permission_scheme",
        () =>
          client.put(`/rest/api/3/permissionscheme/${args.schemeId}`, body),
        { tool: "update_permission_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_permission_scheme ──────────────────────────────────────────────
  server.registerTool(
    "delete_permission_scheme",
    {
      title: "Delete Permission Scheme",
      description:
        "Delete a permission scheme. Cannot delete the default permission scheme or a scheme currently assigned to one or more projects.",
      inputSchema: {
        schemeId: z.number().int().describe("Permission scheme ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_permission_scheme",
        () => client.delete(`/rest/api/3/permissionscheme/${args.schemeId}`),
        { tool: "delete_permission_scheme" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Permission scheme ${args.schemeId} deleted successfully.`,
          },
        ],
      };
    }
  );

  // ── list_permission_scheme_grants ─────────────────────────────────────────
  server.registerTool(
    "list_permission_scheme_grants",
    {
      title: "List Permission Scheme Grants",
      description:
        "List all permission grants in a permission scheme. Shows which permission each holder (user, group, role, etc.) has.",
      inputSchema: {
        schemeId: z.number().int().describe("Permission scheme ID"),
        expand: z.string().optional().describe("Expand fields (e.g. 'user,group,projectRole,field,all')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);

      const result = await logger.time(
        "tool.list_permission_scheme_grants",
        () =>
          client.get(
            `/rest/api/3/permissionscheme/${args.schemeId}/permission?${params}`
          ),
        { tool: "list_permission_scheme_grants" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_permission_scheme_grant ────────────────────────────────────────
  server.registerTool(
    "create_permission_scheme_grant",
    {
      title: "Create Permission Scheme Grant",
      description:
        "Add a new permission grant to a permission scheme. Grants a specific permission to a holder (user, group, project role, etc.).",
      inputSchema: {
        schemeId: z.number().int().describe("Permission scheme ID"),
        permission: z.string().describe("Permission key (e.g. 'BROWSE_PROJECTS', 'CREATE_ISSUES', 'EDIT_ISSUES')"),
        holderType: z
          .string()
          .describe(
            "Holder type: 'anyone', 'group', 'projectRole', 'user', 'reporter', 'assignee', 'projectLead'"
          ),
        holderParameter: z
          .string()
          .optional()
          .describe("Holder parameter (group name, role ID, user account ID, etc.)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        permission: args.permission,
        holder: {
          type: args.holderType,
          ...(args.holderParameter ? { parameter: args.holderParameter } : {}),
        },
      };

      const result = await logger.time(
        "tool.create_permission_scheme_grant",
        () =>
          client.post(
            `/rest/api/3/permissionscheme/${args.schemeId}/permission`,
            body
          ),
        { tool: "create_permission_scheme_grant" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_permission_scheme_grant ────────────────────────────────────────
  server.registerTool(
    "delete_permission_scheme_grant",
    {
      title: "Delete Permission Scheme Grant",
      description:
        "Remove a specific permission grant from a permission scheme by grant ID.",
      inputSchema: {
        schemeId: z.number().int().describe("Permission scheme ID"),
        permissionId: z.number().int().describe("Permission grant ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_permission_scheme_grant",
        () =>
          client.delete(
            `/rest/api/3/permissionscheme/${args.schemeId}/permission/${args.permissionId}`
          ),
        { tool: "delete_permission_scheme_grant" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Permission grant ${args.permissionId} removed from scheme ${args.schemeId}.`,
          },
        ],
      };
    }
  );

  // ── get_project_permission_scheme ─────────────────────────────────────────
  server.registerTool(
    "get_project_permission_scheme",
    {
      title: "Get Project Permission Scheme",
      description:
        "Retrieve the permission scheme currently assigned to a project.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. 'PROJ') or project ID"),
        expand: z.string().optional().describe("Expand fields in the response"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);

      const result = await logger.time(
        "tool.get_project_permission_scheme",
        () =>
          client.get(
            `/rest/api/3/project/${args.projectKeyOrId}/permissionscheme?${params}`
          ),
        { tool: "get_project_permission_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── assign_permission_scheme_to_project ───────────────────────────────────
  server.registerTool(
    "assign_permission_scheme_to_project",
    {
      title: "Assign Permission Scheme to Project",
      description:
        "Assign a permission scheme to a project. This will immediately change the permissions for all users in the project.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key or ID"),
        schemeId: z.number().int().describe("Permission scheme ID to assign"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.assign_permission_scheme_to_project",
        () =>
          client.put(
            `/rest/api/3/project/${args.projectKeyOrId}/permissionscheme`,
            { id: args.schemeId }
          ),
        { tool: "assign_permission_scheme_to_project" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
