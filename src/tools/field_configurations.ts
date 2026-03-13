// Field Configurations tools: list_field_configurations, get_field_configuration, create_field_configuration, update_field_configuration, delete_field_configuration, list_field_configuration_items, update_field_configuration_items, list_field_configuration_schemes, get_field_configuration_scheme
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_field_configurations ─────────────────────────────────────────────
  server.registerTool(
    "list_field_configurations",
    {
      title: "List Field Configurations",
      description:
        "List all field configurations in Jira. Field configurations define which fields are required, hidden, or rendered as a renderer for each issue type. Returns ID, name, description, and default status.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
        id: z.array(z.number().int()).optional().describe("Filter by field configuration IDs"),
        isDefault: z.boolean().optional().describe("Filter to only default configurations"),
        query: z.string().optional().describe("Filter by name (contains search)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.id) args.id.forEach((i) => params.append("id", String(i)));
      if (args.isDefault !== undefined) params.set("isDefault", String(args.isDefault));
      if (args.query) params.set("query", args.query as string);
      const result = await logger.time(
        "tool.list_field_configurations",
        () => client.get(`/fieldconfiguration?${params}`),
        { tool: "list_field_configurations" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_field_configuration ────────────────────────────────────────────
  server.registerTool(
    "create_field_configuration",
    {
      title: "Create Field Configuration",
      description: "Create a new field configuration in Jira.",
      inputSchema: {
        name: z.string().describe("Name of the field configuration"),
        description: z.string().optional().describe("Description"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = { name: args.name };
      if (args.description) payload.description = args.description;
      const result = await logger.time(
        "tool.create_field_configuration",
        () => client.post("/fieldconfiguration", payload),
        { tool: "create_field_configuration" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_field_configuration ────────────────────────────────────────────
  server.registerTool(
    "update_field_configuration",
    {
      title: "Update Field Configuration",
      description: "Update the name or description of a field configuration.",
      inputSchema: {
        id: z.number().int().describe("Field configuration ID"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("New description"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = {};
      if (args.name) payload.name = args.name;
      if (args.description !== undefined) payload.description = args.description;
      const result = await logger.time(
        "tool.update_field_configuration",
        () => client.put(`/fieldconfiguration/${args.id}`, payload),
        { tool: "update_field_configuration" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_field_configuration ────────────────────────────────────────────
  server.registerTool(
    "delete_field_configuration",
    {
      title: "Delete Field Configuration",
      description: "Delete a field configuration. Cannot delete the default configuration.",
      inputSchema: {
        id: z.number().int().describe("Field configuration ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_field_configuration",
        () => client.delete(`/fieldconfiguration/${args.id}`),
        { tool: "delete_field_configuration" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_field_configuration_items ────────────────────────────────────────
  server.registerTool(
    "list_field_configuration_items",
    {
      title: "List Field Configuration Items",
      description:
        "List all fields in a field configuration. Returns the field ID, description, whether the field is hidden/required, and the renderer.",
      inputSchema: {
        id: z.number().int().describe("Field configuration ID"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      const result = await logger.time(
        "tool.list_field_configuration_items",
        () => client.get(`/fieldconfiguration/${args.id}/fields?${params}`),
        { tool: "list_field_configuration_items" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_field_configuration_items ─────────────────────────────────────
  server.registerTool(
    "update_field_configuration_items",
    {
      title: "Update Field Configuration Items",
      description:
        "Update the fields in a field configuration (set required, hidden status, and renderer for each field).",
      inputSchema: {
        id: z.number().int().describe("Field configuration ID"),
        fieldConfigurationItems: z
          .array(
            z.object({
              id: z.string().describe("Field ID (e.g. 'summary', 'description', or custom field ID)"),
              description: z.string().optional().describe("Field description override"),
              isHidden: z.boolean().optional().describe("Whether the field is hidden"),
              isRequired: z.boolean().optional().describe("Whether the field is required"),
              renderer: z.string().optional().describe("Renderer key (e.g. 'text-renderer', 'wiki-renderer')"),
            })
          )
          .describe("Field configuration items to update"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.update_field_configuration_items",
        () => client.put(`/fieldconfiguration/${args.id}/fields`, { fieldConfigurationItems: args.fieldConfigurationItems }),
        { tool: "update_field_configuration_items" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_field_configuration_schemes ─────────────────────────────────────
  server.registerTool(
    "list_field_configuration_schemes",
    {
      title: "List Field Configuration Schemes",
      description:
        "List all field configuration schemes in Jira. A field configuration scheme maps issue types to field configurations within a project.",
      inputSchema: {
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(50).optional().describe("Results per page (default 50)"),
        id: z.array(z.number().int()).optional().describe("Filter by scheme IDs"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.id) args.id.forEach((i) => params.append("id", String(i)));
      const result = await logger.time(
        "tool.list_field_configuration_schemes",
        () => client.get(`/fieldconfigurationscheme?${params}`),
        { tool: "list_field_configuration_schemes" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
