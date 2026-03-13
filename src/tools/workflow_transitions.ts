// Workflow Transition Properties tools: get_workflow_transition_properties,
// create_workflow_transition_property, update_workflow_transition_property,
// delete_workflow_transition_property, get_workflow_transition_rule_configs,
// update_workflow_transition_rule_configs
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_workflow_transition_properties ────────────────────────────────────
  server.registerTool(
    "get_workflow_transition_properties",
    {
      title: "Get Workflow Transition Properties",
      description:
        "Retrieve the properties of a workflow transition. Transition properties are key-value metadata used to configure transition behaviour (e.g. JIRA.ISSUE.EDITABLE). Returns property keys and values.",
      inputSchema: {
        transitionId: z.number().int().describe("Workflow transition ID"),
        workflowName: z.string().describe("Workflow name"),
        workflowMode: z
          .enum(["live", "draft"])
          .optional()
          .describe("Whether to query the live or draft workflow (default: live)"),
        includeReservedKeys: z
          .boolean()
          .optional()
          .describe("If true, include Jira system properties (default: false)"),
        key: z.string().optional().describe("Filter by a specific property key"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("transitionId", String(args.transitionId));
      params.set("workflowName", args.workflowName as string);
      if (args.workflowMode) params.set("workflowMode", args.workflowMode as string);
      if (args.includeReservedKeys !== undefined)
        params.set("includeReservedKeys", String(args.includeReservedKeys));
      if (args.key) params.set("key", args.key as string);

      const result = await logger.time(
        "tool.get_workflow_transition_properties",
        () =>
          client.get(
            `/rest/api/3/workflow/transitions/${args.transitionId}/properties?${params}`
          ),
        { tool: "get_workflow_transition_properties" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_workflow_transition_property ───────────────────────────────────
  server.registerTool(
    "create_workflow_transition_property",
    {
      title: "Create Workflow Transition Property",
      description:
        "Add a new property to a workflow transition. Properties control transition behaviour such as post-functions and screen behaviour.",
      inputSchema: {
        transitionId: z.number().int().describe("Workflow transition ID"),
        workflowName: z.string().describe("Workflow name"),
        workflowMode: z
          .enum(["live", "draft"])
          .optional()
          .describe("Workflow mode (default: live)"),
        key: z.string().describe("Property key (e.g. 'jira.issue.editable')"),
        value: z.string().describe("Property value"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("workflowName", args.workflowName as string);
      if (args.workflowMode) params.set("workflowMode", args.workflowMode as string);
      params.set("key", args.key as string);

      const result = await logger.time(
        "tool.create_workflow_transition_property",
        () =>
          client.request(
            `/rest/api/3/workflow/transitions/${args.transitionId}/properties?${params}`,
            {
              method: "POST",
              body: JSON.stringify({ key: args.key, value: args.value }),
            }
          ),
        { tool: "create_workflow_transition_property" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_workflow_transition_property ───────────────────────────────────
  server.registerTool(
    "update_workflow_transition_property",
    {
      title: "Update Workflow Transition Property",
      description:
        "Update the value of an existing workflow transition property.",
      inputSchema: {
        transitionId: z.number().int().describe("Workflow transition ID"),
        workflowName: z.string().describe("Workflow name"),
        workflowMode: z.enum(["live", "draft"]).optional().describe("Workflow mode"),
        key: z.string().describe("Property key to update"),
        value: z.string().describe("New property value"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("workflowName", args.workflowName as string);
      if (args.workflowMode) params.set("workflowMode", args.workflowMode as string);
      params.set("key", args.key as string);

      const result = await logger.time(
        "tool.update_workflow_transition_property",
        () =>
          client.request(
            `/rest/api/3/workflow/transitions/${args.transitionId}/properties?${params}`,
            {
              method: "PUT",
              body: JSON.stringify({ key: args.key, value: args.value }),
            }
          ),
        { tool: "update_workflow_transition_property" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_workflow_transition_property ───────────────────────────────────
  server.registerTool(
    "delete_workflow_transition_property",
    {
      title: "Delete Workflow Transition Property",
      description:
        "Delete a property from a workflow transition.",
      inputSchema: {
        transitionId: z.number().int().describe("Workflow transition ID"),
        workflowName: z.string().describe("Workflow name"),
        workflowMode: z.enum(["live", "draft"]).optional().describe("Workflow mode"),
        key: z.string().describe("Property key to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("workflowName", args.workflowName as string);
      if (args.workflowMode) params.set("workflowMode", args.workflowMode as string);
      params.set("key", args.key as string);

      await logger.time(
        "tool.delete_workflow_transition_property",
        () =>
          client.delete(
            `/rest/api/3/workflow/transitions/${args.transitionId}/properties?${params}`
          ),
        { tool: "delete_workflow_transition_property" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Property '${args.key}' deleted from transition ${args.transitionId}.`,
          },
        ],
      };
    }
  );

  // ── get_workflow_transition_rule_configs ──────────────────────────────────
  server.registerTool(
    "get_workflow_transition_rule_configs",
    {
      title: "Get Workflow Transition Rule Configurations",
      description:
        "Retrieve all transition rule configurations (conditions, validators, post-functions) for workflows using a specific Connect app rule. Returns details about configured rules across all workflows.",
      inputSchema: {
        types: z
          .array(z.enum(["condition", "validator", "function"]))
          .min(1)
          .describe("Types of workflow rules to retrieve"),
        expand: z
          .string()
          .optional()
          .describe("Expand additional data (e.g. 'transition')"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset"),
        maxResults: z.number().int().min(1).max(10).optional().describe("Results per page (default 10)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      for (const t of args.types as string[]) params.append("types", t);
      if (args.expand) params.set("expand", args.expand as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 10));

      const result = await logger.time(
        "tool.get_workflow_transition_rule_configs",
        () =>
          client.get(`/rest/api/3/workflow/rule/config?${params}`),
        { tool: "get_workflow_transition_rule_configs" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_workflow_statuses ────────────────────────────────────────────────
  server.registerTool(
    "list_workflow_statuses",
    {
      title: "List Workflow Statuses",
      description:
        "List all statuses used by all workflows in the Jira instance. Returns status ID, name, category, and which workflows reference the status.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.list_workflow_statuses",
        () => client.get("/rest/api/3/statuses"),
        { tool: "list_workflow_statuses" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
