// Custom Field Contexts tools: list_field_contexts, get_field_context,
// create_field_context, update_field_context, delete_field_context,
// get_context_default_values, set_context_default_values,
// list_context_projects, assign_context_to_projects, remove_context_from_projects
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_custom_field_contexts ────────────────────────────────────────────
  server.registerTool(
    "list_custom_field_contexts",
    {
      title: "List Custom Field Contexts",
      description:
        "List all contexts for a custom field. Contexts define where a custom field is available (which projects and issue types) and what options it has. Returns context ID, name, and scope.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID (e.g. 'customfield_10001')"),
        projectIds: z
          .array(z.string())
          .optional()
          .describe("Filter by project IDs — only return contexts for these projects"),
        isAnyIssueType: z
          .boolean()
          .optional()
          .describe("If true, return only global contexts (all issue types)"),
        isGlobalContext: z
          .boolean()
          .optional()
          .describe("If true, return only global contexts (all projects)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.projectIds) {
        for (const pid of args.projectIds as string[]) params.append("projectId", pid);
      }
      if (args.isAnyIssueType !== undefined)
        params.set("isAnyIssueType", String(args.isAnyIssueType));
      if (args.isGlobalContext !== undefined)
        params.set("isGlobalContext", String(args.isGlobalContext));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.list_custom_field_contexts",
        () =>
          client.get(
            `/rest/api/3/field/${args.fieldId}/context?${params}`
          ),
        { tool: "list_custom_field_contexts" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_field_context ──────────────────────────────────────────────────
  server.registerTool(
    "create_field_context",
    {
      title: "Create Custom Field Context",
      description:
        "Create a new context for a custom field. A context defines the scope (projects, issue types) where the field appears and can have its own default value and options.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID"),
        name: z.string().describe("Context name"),
        description: z.string().optional().describe("Context description"),
        projectIds: z
          .array(z.string())
          .optional()
          .describe("Project IDs this context applies to (empty = all projects)"),
        issueTypeIds: z
          .array(z.string())
          .optional()
          .describe("Issue type IDs this context applies to (empty = all issue types)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = { name: args.name };
      if (args.description) body.description = args.description;
      if (args.projectIds) body.projectIds = args.projectIds;
      if (args.issueTypeIds) body.issueTypeIds = args.issueTypeIds;

      const result = await logger.time(
        "tool.create_field_context",
        () =>
          client.request(`/rest/api/3/field/${args.fieldId}/context`, {
            method: "POST",
            body: JSON.stringify(body),
          }),
        { tool: "create_field_context" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_field_context ──────────────────────────────────────────────────
  server.registerTool(
    "update_field_context",
    {
      title: "Update Custom Field Context",
      description:
        "Update the name and/or description of a custom field context.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID"),
        contextId: z.number().int().describe("Context ID"),
        name: z.string().optional().describe("New context name"),
        description: z.string().optional().describe("New context description"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;

      const result = await logger.time(
        "tool.update_field_context",
        () =>
          client.request(
            `/rest/api/3/field/${args.fieldId}/context/${args.contextId}`,
            { method: "PUT", body: JSON.stringify(body) }
          ),
        { tool: "update_field_context" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_field_context ──────────────────────────────────────────────────
  server.registerTool(
    "delete_field_context",
    {
      title: "Delete Custom Field Context",
      description:
        "Delete a custom field context. This removes the context and any associated options. Issues using those options will lose the field value.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID"),
        contextId: z.number().int().describe("Context ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_field_context",
        () =>
          client.request(
            `/rest/api/3/field/${args.fieldId}/context/${args.contextId}`,
            { method: "DELETE" }
          ),
        { tool: "delete_field_context" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Context ${args.contextId} for field ${args.fieldId} deleted successfully.`,
          },
        ],
      };
    }
  );

  // ── get_context_default_values ────────────────────────────────────────────
  server.registerTool(
    "get_context_default_values",
    {
      title: "Get Custom Field Context Default Values",
      description:
        "Retrieve the default values configured for custom field contexts. Default values are pre-filled when a user creates a new issue in the context's scope.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID"),
        contextId: z.array(z.number().int()).optional().describe("Filter by context IDs"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.contextId) {
        for (const id of args.contextId as number[]) params.append("contextId", String(id));
      }
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));

      const result = await logger.time(
        "tool.get_context_default_values",
        () =>
          client.get(`/rest/api/3/field/${args.fieldId}/context/defaultValue?${params}`),
        { tool: "get_context_default_values" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── set_context_default_values ────────────────────────────────────────────
  server.registerTool(
    "set_context_default_values",
    {
      title: "Set Custom Field Context Default Values",
      description:
        "Set or update the default values for one or more custom field contexts. The structure of each default value depends on the field type (text, option, cascade, etc).",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID"),
        defaultValues: z
          .array(
            z.object({
              contextId: z.string().describe("Context ID"),
              type: z
                .string()
                .describe(
                  "Default value type (e.g. 'option.single', 'option.multiple', 'text', 'float', 'datepicker')"
                ),
            }).catchall(z.unknown())
          )
          .describe("Array of default value objects, one per context"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.set_context_default_values",
        () =>
          client.request(`/rest/api/3/field/${args.fieldId}/context/defaultValue`, {
            method: "PUT",
            body: JSON.stringify({ defaultValues: args.defaultValues }),
          }),
        { tool: "set_context_default_values" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Default values updated.",
          },
        ],
      };
    }
  );

  // ── assign_context_to_projects ────────────────────────────────────────────
  server.registerTool(
    "assign_context_to_projects",
    {
      title: "Assign Field Context to Projects",
      description:
        "Associate a custom field context with specific projects. Issues in those projects will use this context's configuration, options, and defaults.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID"),
        contextId: z.number().int().describe("Context ID"),
        projectIds: z.array(z.string()).min(1).describe("Project IDs to assign this context to"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.assign_context_to_projects",
        () =>
          client.request(
            `/rest/api/3/field/${args.fieldId}/context/${args.contextId}/project`,
            {
              method: "PUT",
              body: JSON.stringify({ projectIds: args.projectIds }),
            }
          ),
        { tool: "assign_context_to_projects" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Context assigned to projects.",
          },
        ],
      };
    }
  );
}
