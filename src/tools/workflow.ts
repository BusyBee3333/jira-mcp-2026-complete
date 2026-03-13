// Workflow tools: list_workflows, get_workflow, create_workflow, update_workflow, delete_workflow, get_workflow_transitions, list_workflow_transition_rules
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_workflows ────────────────────────────────────────────────────────
  server.registerTool(
    "list_workflows",
    {
      title: "List Workflows",
      description:
        "List all workflows in Jira. Workflows define the statuses and transitions for issue resolution. Returns workflow name, description, steps, transitions, default status, and whether the workflow is active.",
      inputSchema: {
        workflowName: z.array(z.string()).optional().describe("Filter by workflow names"),
        expand: z.string().optional().describe("Expand fields (e.g. 'transitions,statuses,operations')"),
        queryString: z.string().optional().describe("Filter by name (partial match)"),
        orderBy: z
          .enum(["name", "-name", "created", "-created", "updated", "-updated"])
          .optional()
          .describe("Sort order"),
        isActive: z.boolean().optional().describe("Filter by active status"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Results per page (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.workflowName) args.workflowName.forEach((n) => params.append("workflowName", n));
      if (args.expand) params.set("expand", args.expand as string);
      if (args.queryString) params.set("queryString", args.queryString as string);
      if (args.orderBy) params.set("orderBy", args.orderBy as string);
      if (args.isActive !== undefined) params.set("isActive", String(args.isActive));
      const result = await logger.time(
        "tool.list_workflows",
        () => client.get(`/workflow/search?${params}`),
        { tool: "list_workflows" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_workflow ──────────────────────────────────────────────────────────
  server.registerTool(
    "get_workflow",
    {
      title: "Get Workflow",
      description: "Get detailed information about a specific workflow including its statuses, transitions, and properties.",
      inputSchema: {
        workflowName: z.string().describe("Workflow name"),
        expand: z.string().optional().describe("Expand fields (e.g. 'transitions,statuses,operations')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ workflowName: args.workflowName as string });
      if (args.expand) params.set("expand", args.expand as string);
      const result = await logger.time(
        "tool.get_workflow",
        () => client.get(`/workflow?${params}`),
        { tool: "get_workflow" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { workflows: result } as Record<string, unknown>,
      };
    }
  );

  // ── create_workflow ───────────────────────────────────────────────────────
  server.registerTool(
    "create_workflow",
    {
      title: "Create Workflow",
      description:
        "Create a new workflow with statuses, transitions, and properties. Workflows can be assigned to projects via workflow schemes.",
      inputSchema: {
        name: z.string().describe("Workflow name (must be unique)"),
        description: z.string().optional().describe("Description of the workflow"),
        statuses: z
          .array(
            z.object({
              id: z.string().describe("Status ID"),
              properties: z.record(z.string()).optional().describe("Status properties"),
            })
          )
          .describe("List of statuses in the workflow"),
        transitions: z
          .array(
            z.object({
              name: z.string().describe("Transition name"),
              from: z.array(z.string()).optional().describe("Source status IDs (empty = initial transition)"),
              to: z.string().describe("Target status ID"),
              type: z.enum(["initial", "global", "directed"]).optional().describe("Transition type"),
            })
          )
          .describe("List of transitions in the workflow"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = {
        name: args.name,
        statuses: args.statuses,
        transitions: args.transitions,
      };
      if (args.description) payload.description = args.description;
      const result = await logger.time(
        "tool.create_workflow",
        () => client.post("/workflow", payload),
        { tool: "create_workflow" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_workflow ───────────────────────────────────────────────────────
  server.registerTool(
    "delete_workflow",
    {
      title: "Delete Inactive Workflow",
      description:
        "Delete a workflow that is not currently active (not used by any workflow scheme). Active workflows cannot be deleted.",
      inputSchema: {
        entityId: z.string().describe("Workflow entity ID (UUID format, found in workflow search results)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_workflow",
        () => client.delete(`/workflow/${args.entityId}`),
        { tool: "delete_workflow" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_workflow_schemes ─────────────────────────────────────────────────
  server.registerTool(
    "list_workflow_schemes",
    {
      title: "List Workflow Schemes",
      description:
        "List all workflow schemes in Jira. Workflow schemes map issue types to workflows within projects. Returns scheme ID, name, description, default workflow, and issue type mappings.",
      inputSchema: {
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
        "tool.list_workflow_schemes",
        () => client.get(`/workflowscheme?${params}`),
        { tool: "list_workflow_schemes" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_workflow_scheme ───────────────────────────────────────────────────
  server.registerTool(
    "get_workflow_scheme",
    {
      title: "Get Workflow Scheme",
      description: "Get details of a specific workflow scheme including its workflow-to-issue-type mappings.",
      inputSchema: {
        id: z.number().int().describe("Workflow scheme ID"),
        returnDraftIfExists: z.boolean().optional().describe("Return draft scheme if one exists (default false)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.returnDraftIfExists !== undefined) params.set("returnDraftIfExists", String(args.returnDraftIfExists));
      const qs = params.toString() ? `?${params}` : "";
      const result = await logger.time(
        "tool.get_workflow_scheme",
        () => client.get(`/workflowscheme/${args.id}${qs}`),
        { tool: "get_workflow_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
