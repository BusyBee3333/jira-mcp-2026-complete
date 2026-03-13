// Project Roles Detail tools: list_all_project_roles, get_project_role_by_id, create_project_role, update_project_role, delete_project_role, get_project_role_actors_for_role, add_actors_to_project_role, remove_actor_from_project_role, set_project_role_actors, delete_project_role_default_actors
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_all_project_roles ────────────────────────────────────────────────
  server.registerTool(
    "list_all_project_roles",
    {
      title: "List All Project Roles",
      description:
        "List all project roles defined in Jira. Returns role ID, name, description, scope, and actor details. Project roles can be used to grant permissions at the project level.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.list_all_project_roles",
        () => client.get("/role"),
        { tool: "list_all_project_roles" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { roles: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_project_role_by_id ────────────────────────────────────────────────
  server.registerTool(
    "get_project_role_by_id",
    {
      title: "Get Project Role by ID",
      description: "Get details of a specific project role by its numeric ID.",
      inputSchema: {
        roleId: z.number().int().describe("Project role ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_project_role_by_id",
        () => client.get(`/role/${args.roleId}`),
        { tool: "get_project_role_by_id" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_project_role ───────────────────────────────────────────────────
  server.registerTool(
    "create_project_role",
    {
      title: "Create Project Role",
      description: "Create a new project role in Jira. Returns the created role with its ID.",
      inputSchema: {
        name: z.string().describe("Name of the new project role"),
        description: z.string().optional().describe("Description of the role"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = { name: args.name };
      if (args.description) payload.description = args.description;
      const result = await logger.time(
        "tool.create_project_role",
        () => client.post("/role", payload),
        { tool: "create_project_role" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_project_role ───────────────────────────────────────────────────
  server.registerTool(
    "update_project_role",
    {
      title: "Update Project Role",
      description: "Fully update (replace) a project role name and description.",
      inputSchema: {
        roleId: z.number().int().describe("Project role ID"),
        name: z.string().describe("New name for the role"),
        description: z.string().optional().describe("New description"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = { name: args.name };
      if (args.description) payload.description = args.description;
      const result = await logger.time(
        "tool.update_project_role",
        () => client.put(`/role/${args.roleId}`, payload),
        { tool: "update_project_role" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_project_role ───────────────────────────────────────────────────
  server.registerTool(
    "delete_project_role",
    {
      title: "Delete Project Role",
      description: "Delete a project role. Optionally swap existing associations to another role.",
      inputSchema: {
        roleId: z.number().int().describe("Project role ID to delete"),
        swap: z.number().int().optional().describe("Role ID to transfer existing associations to"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.swap !== undefined) params.set("swap", String(args.swap));
      const qs = params.toString() ? `?${params}` : "";
      const result = await logger.time(
        "tool.delete_project_role",
        () => client.delete(`/role/${args.roleId}${qs}`),
        { tool: "delete_project_role" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_project_role_actors ───────────────────────────────────────────────
  server.registerTool(
    "get_project_role_actors",
    {
      title: "Get Project Role Actors",
      description:
        "Get the actors (users and groups) assigned to a role in a specific project. Returns a list of actors with type (user/group), display name, and account ID.",
      inputSchema: {
        projectKey: z.string().describe("Project key (e.g. PROJ)"),
        roleId: z.number().int().describe("Role ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_project_role_actors",
        () => client.get(`/project/${args.projectKey}/role/${args.roleId}`),
        { tool: "get_project_role_actors" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_actors_to_project_role ────────────────────────────────────────────
  server.registerTool(
    "add_actors_to_project_role",
    {
      title: "Add Actors to Project Role",
      description:
        "Add users or groups as actors for a project role in a specific project.",
      inputSchema: {
        projectKey: z.string().describe("Project key (e.g. PROJ)"),
        roleId: z.number().int().describe("Role ID"),
        userAccountIds: z.array(z.string()).optional().describe("Account IDs of users to add"),
        groupIds: z.array(z.string()).optional().describe("Group IDs to add"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = {};
      if (args.userAccountIds?.length) payload.user = args.userAccountIds;
      if (args.groupIds?.length) payload.groupId = args.groupIds;
      const result = await logger.time(
        "tool.add_actors_to_project_role",
        () => client.post(`/project/${args.projectKey}/role/${args.roleId}`, payload),
        { tool: "add_actors_to_project_role" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── remove_actor_from_project_role ────────────────────────────────────────
  server.registerTool(
    "remove_actor_from_project_role",
    {
      title: "Remove Actor from Project Role",
      description: "Remove a user or group from a project role in a specific project.",
      inputSchema: {
        projectKey: z.string().describe("Project key (e.g. PROJ)"),
        roleId: z.number().int().describe("Role ID"),
        actorAccountId: z.string().optional().describe("Account ID of the user to remove"),
        actorGroupId: z.string().optional().describe("Group ID to remove"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.actorAccountId) params.set("user", args.actorAccountId as string);
      if (args.actorGroupId) params.set("groupId", args.actorGroupId as string);
      const result = await logger.time(
        "tool.remove_actor_from_project_role",
        () => client.delete(`/project/${args.projectKey}/role/${args.roleId}?${params}`),
        { tool: "remove_actor_from_project_role" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
