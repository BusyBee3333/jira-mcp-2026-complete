// Custom fields tools: list_fields, get_field, list_field_contexts, get_field_options
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_fields ────────────────────────────────────────────────────────────
  server.registerTool(
    "list_fields",
    {
      title: "List Jira Fields",
      description:
        "List all Jira fields including both system fields and custom fields. Returns field ID, name, type, and whether it's custom. Use field IDs when setting custom field values in create_issue or update_issue.",
      inputSchema: {
        type: z
          .enum(["custom", "system", "all"])
          .optional()
          .describe("Filter by field type: 'custom', 'system', or 'all' (default: all)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50, max 200)"),
        query: z.string().optional().describe("Filter fields by name (partial match)"),
        projectIds: z.array(z.string()).optional().describe("Filter fields by project IDs"),
        screenIds: z.array(z.string()).optional().describe("Filter fields by screen IDs"),
        orderBy: z
          .enum(["contextsCount", "-contextsCount", "lastUsed", "-lastUsed", "name", "-name", "screensCount", "-screensCount"])
          .optional()
          .describe("Sort order"),
        expand: z.string().optional().describe("Expand fields (e.g. 'key,searcherKey')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const fieldType = args.type ?? "all";

      if (fieldType === "all" && !args.query && !args.projectIds && !args.screenIds) {
        // Use the simple fields endpoint for a flat list
        const result = await logger.time(
          "tool.list_fields",
          () => client.get("/field"),
          { tool: "list_fields" }
        ) as unknown[];

        const filtered = fieldType === "all"
          ? result
          : result.filter((f: unknown) => {
              const field = f as Record<string, unknown>;
              return fieldType === "custom" ? field.custom === true : field.custom === false;
            });

        const response = { total: filtered.length, fields: filtered };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
          structuredContent: response as Record<string, unknown>,
        };
      }

      // Use paginated search endpoint
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.type && args.type !== "all") params.set("type", args.type as string);
      if (args.query) params.set("query", args.query as string);
      if (args.orderBy) params.set("orderBy", args.orderBy as string);
      if (args.expand) params.set("expand", args.expand as string);
      if (args.projectIds) {
        (args.projectIds as string[]).forEach((id) => params.append("projectIds", id));
      }
      if (args.screenIds) {
        (args.screenIds as string[]).forEach((id) => params.append("screenIds", id));
      }

      const result = await logger.time(
        "tool.list_fields",
        () => client.get(`/field/search?${params}`),
        { tool: "list_fields" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_field ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_field",
    {
      title: "Get Field Details",
      description:
        "Get details for a specific Jira field by ID. Returns name, type, schema, and configuration. Field IDs are typically in the format 'customfield_10001' for custom fields.",
      inputSchema: {
        fieldId: z.string().describe("Field ID (e.g. 'customfield_10001', 'summary', 'priority')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      // Get all fields and filter by ID (Jira doesn't have a single-field GET endpoint in v3)
      const fields = await logger.time(
        "tool.get_field",
        () => client.get<unknown[]>("/field"),
        { tool: "get_field", fieldId: args.fieldId as string }
      );

      const field = fields.find((f: unknown) => {
        const field = f as Record<string, unknown>;
        return field.id === args.fieldId || field.key === args.fieldId;
      });

      if (!field) {
        throw new Error(`Field '${args.fieldId}' not found. Use list_fields to see available field IDs.`);
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(field, null, 2) }],
        structuredContent: field as Record<string, unknown>,
      };
    }
  );

  // ── list_field_contexts ────────────────────────────────────────────────────
  server.registerTool(
    "list_field_contexts",
    {
      title: "List Field Contexts",
      description:
        "List the contexts for a custom field. Contexts define which projects and issue types the field applies to. Returns context ID, name, and whether it's the global context.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID (e.g. 'customfield_10001')"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
        isAnyIssueType: z.boolean().optional().describe("Filter contexts applicable to any issue type"),
        isGlobalContext: z.boolean().optional().describe("Filter global contexts only"),
        contextId: z.array(z.number().int()).optional().describe("Filter by specific context IDs"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.isAnyIssueType !== undefined) params.set("isAnyIssueType", String(args.isAnyIssueType));
      if (args.isGlobalContext !== undefined) params.set("isGlobalContext", String(args.isGlobalContext));
      if (args.contextId) {
        (args.contextId as number[]).forEach((id) => params.append("contextId", String(id)));
      }

      const result = await logger.time(
        "tool.list_field_contexts",
        () => client.get(`/field/${args.fieldId}/context?${params}`),
        { tool: "list_field_contexts", fieldId: args.fieldId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_field_options ──────────────────────────────────────────────────────
  server.registerTool(
    "get_field_options",
    {
      title: "Get Field Options",
      description:
        "Get the available options for a custom select/multi-select field in a specific context. Returns option ID, value, and disabled status. Use list_field_contexts to find context IDs.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID (e.g. 'customfield_10001')"),
        contextId: z.number().int().describe("Context ID (from list_field_contexts)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
        onlyOptions: z.boolean().optional().describe("Return only options (not cascading children)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.onlyOptions !== undefined) params.set("onlyOptions", String(args.onlyOptions));

      const result = await logger.time(
        "tool.get_field_options",
        () => client.get(`/field/${args.fieldId}/context/${args.contextId}/option?${params}`),
        { tool: "get_field_options", fieldId: args.fieldId as string, contextId: String(args.contextId) }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
