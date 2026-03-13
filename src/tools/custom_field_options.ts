// Custom Field Options tools: list_field_context_options, create_field_options,
// update_field_options, delete_field_option, reorder_field_options,
// list_cascading_select_options, create_cascading_option
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_field_context_options ────────────────────────────────────────────
  server.registerTool(
    "list_field_context_options",
    {
      title: "List Custom Field Context Options",
      description:
        "List all options for a custom field context (e.g. options for a Select list or Multi-select field). Returns option ID, value, and disabled status.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID (e.g. 'customfield_10001')"),
        contextId: z.number().int().describe("Context ID"),
        optionId: z.number().int().optional().describe("Filter by specific option ID"),
        onlyOptions: z
          .boolean()
          .optional()
          .describe("If true, return only options (not cascading parent options)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(1000).optional().describe("Results per page (default 100)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.optionId !== undefined) params.set("optionId", String(args.optionId));
      if (args.onlyOptions !== undefined) params.set("onlyOptions", String(args.onlyOptions));
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 100));

      const result = await logger.time(
        "tool.list_field_context_options",
        () =>
          client.get(
            `/rest/api/3/field/${args.fieldId}/context/${args.contextId}/option?${params}`
          ),
        { tool: "list_field_context_options" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_field_options ──────────────────────────────────────────────────
  server.registerTool(
    "create_field_options",
    {
      title: "Create Custom Field Options",
      description:
        "Create new options for a custom field context. Each option needs a value (the displayed text). Supports up to 1000 options per context.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID"),
        contextId: z.number().int().describe("Context ID"),
        options: z
          .array(
            z.object({
              value: z.string().describe("Option display value"),
              disabled: z.boolean().optional().describe("Whether the option is disabled"),
              optionId: z
                .string()
                .optional()
                .describe("Parent option ID for cascading select child options"),
            })
          )
          .min(1)
          .describe("Options to create"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.create_field_options",
        () =>
          client.request(
            `/rest/api/3/field/${args.fieldId}/context/${args.contextId}/option`,
            {
              method: "POST",
              body: JSON.stringify({ options: args.options }),
            }
          ),
        { tool: "create_field_options" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_field_options ──────────────────────────────────────────────────
  server.registerTool(
    "update_field_options",
    {
      title: "Update Custom Field Options",
      description:
        "Update the value or disabled status of existing custom field options. You must provide the option ID for each option to update.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID"),
        contextId: z.number().int().describe("Context ID"),
        options: z
          .array(
            z.object({
              id: z.string().describe("Option ID to update"),
              value: z.string().describe("New option value"),
              disabled: z.boolean().optional().describe("Whether this option should be disabled"),
            })
          )
          .min(1)
          .describe("Options to update with their new values"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.update_field_options",
        () =>
          client.request(
            `/rest/api/3/field/${args.fieldId}/context/${args.contextId}/option`,
            {
              method: "PUT",
              body: JSON.stringify({ options: args.options }),
            }
          ),
        { tool: "update_field_options" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_field_option ───────────────────────────────────────────────────
  server.registerTool(
    "delete_field_option",
    {
      title: "Delete Custom Field Option",
      description:
        "Delete a specific option from a custom field context. Issues using this option will have the field value cleared or updated based on the field configuration.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID"),
        contextId: z.number().int().describe("Context ID"),
        optionId: z.number().int().describe("Option ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_field_option",
        () =>
          client.delete(
            `/rest/api/3/field/${args.fieldId}/context/${args.contextId}/option/${args.optionId}`
          ),
        { tool: "delete_field_option" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Option ${args.optionId} deleted from field ${args.fieldId} context ${args.contextId}.`,
          },
        ],
      };
    }
  );

  // ── reorder_field_options ─────────────────────────────────────────────────
  server.registerTool(
    "reorder_field_options",
    {
      title: "Reorder Custom Field Options",
      description:
        "Change the display order of options in a custom field context. Specify option IDs in the desired new order, and optionally position them before or after a specific option.",
      inputSchema: {
        fieldId: z.string().describe("Custom field ID"),
        contextId: z.number().int().describe("Context ID"),
        customFieldOptionIds: z
          .array(z.string())
          .min(1)
          .describe("Option IDs in the new desired order"),
        position: z
          .enum(["First", "Last"])
          .optional()
          .describe("Move options to First or Last position (use instead of after/before)"),
        after: z
          .string()
          .optional()
          .describe("Option ID to insert after (mutually exclusive with position)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        customFieldOptionIds: args.customFieldOptionIds,
      };
      if (args.position) body.position = args.position;
      if (args.after) body.after = args.after;

      const result = await logger.time(
        "tool.reorder_field_options",
        () =>
          client.request(
            `/rest/api/3/field/${args.fieldId}/context/${args.contextId}/option/move`,
            { method: "PUT", body: JSON.stringify(body) }
          ),
        { tool: "reorder_field_options" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Options reordered successfully.",
          },
        ],
      };
    }
  );
}
