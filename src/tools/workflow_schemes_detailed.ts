// Workflow Schemes Detailed tools: create_workflow_scheme, update_workflow_scheme,
// delete_workflow_scheme, get_workflow_scheme_draft, publish_workflow_scheme_draft,
// associate_workflow_with_scheme, set_default_workflow_in_scheme,
// get_scheme_workflow_for_issue_type, delete_workflow_from_scheme
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── create_workflow_scheme ────────────────────────────────────────────────
  server.registerTool(
    "create_workflow_scheme",
    {
      title: "Create Workflow Scheme",
      description:
        "Create a new workflow scheme. A workflow scheme maps issue types to workflows. You can set a default workflow and then map specific issue types to different workflows.",
      inputSchema: {
        name: z.string().describe("Workflow scheme name"),
        description: z.string().optional().describe("Description"),
        defaultWorkflow: z.string().optional().describe("Default workflow name (used for issue types not explicitly mapped)"),
        issueTypeMappings: z
          .record(z.string())
          .optional()
          .describe("Map of issue type ID to workflow name (e.g. { '10001': 'Bug Workflow' })"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = { name: args.name };
      if (args.description) body.description = args.description;
      if (args.defaultWorkflow) body.defaultWorkflow = args.defaultWorkflow;
      if (args.issueTypeMappings) body.issueTypeMappings = args.issueTypeMappings;

      const result = await logger.time(
        "tool.create_workflow_scheme",
        () => client.post("/rest/api/3/workflowscheme", body),
        { tool: "create_workflow_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_workflow_scheme ────────────────────────────────────────────────
  server.registerTool(
    "update_workflow_scheme",
    {
      title: "Update Workflow Scheme",
      description:
        "Update an existing workflow scheme. Changes the name, description, default workflow, or issue type mappings.",
      inputSchema: {
        workflowSchemeId: z.number().int().describe("Workflow scheme ID"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("New description"),
        defaultWorkflow: z.string().optional().describe("New default workflow name"),
        issueTypeMappings: z
          .record(z.string())
          .optional()
          .describe("Updated issue type to workflow mappings"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;
      if (args.defaultWorkflow) body.defaultWorkflow = args.defaultWorkflow;
      if (args.issueTypeMappings) body.issueTypeMappings = args.issueTypeMappings;

      const result = await logger.time(
        "tool.update_workflow_scheme",
        () =>
          client.put(`/rest/api/3/workflowscheme/${args.workflowSchemeId}`, body),
        { tool: "update_workflow_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_workflow_scheme ────────────────────────────────────────────────
  server.registerTool(
    "delete_workflow_scheme",
    {
      title: "Delete Workflow Scheme",
      description:
        "Delete a workflow scheme. The scheme cannot be deleted if it is actively assigned to any projects.",
      inputSchema: {
        workflowSchemeId: z.number().int().describe("Workflow scheme ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_workflow_scheme",
        () =>
          client.delete(`/rest/api/3/workflowscheme/${args.workflowSchemeId}`),
        { tool: "delete_workflow_scheme" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Workflow scheme ${args.workflowSchemeId} deleted successfully.`,
          },
        ],
      };
    }
  );

  // ── get_workflow_scheme_draft ─────────────────────────────────────────────
  server.registerTool(
    "get_workflow_scheme_draft",
    {
      title: "Get Workflow Scheme Draft",
      description:
        "Retrieve the draft of a workflow scheme. When a workflow scheme is in use by projects, changes create a draft. The draft must be published for changes to take effect.",
      inputSchema: {
        workflowSchemeId: z.number().int().describe("Workflow scheme ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_workflow_scheme_draft",
        () =>
          client.get(`/rest/api/3/workflowscheme/${args.workflowSchemeId}/draft`),
        { tool: "get_workflow_scheme_draft" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── publish_workflow_scheme_draft ─────────────────────────────────────────
  server.registerTool(
    "publish_workflow_scheme_draft",
    {
      title: "Publish Workflow Scheme Draft",
      description:
        "Publish the draft of a workflow scheme to make it the live version. This initiates a task that migrates existing issues to the new workflow. Returns a task ID for tracking progress.",
      inputSchema: {
        workflowSchemeId: z.number().int().describe("Workflow scheme ID"),
        statusMappings: z
          .array(
            z.object({
              issueTypeId: z.string().describe("Issue type ID"),
              statusId: z.string().describe("Old status ID"),
              newStatusId: z.string().describe("New status ID to migrate issues to"),
            })
          )
          .optional()
          .describe("Status migration mappings for issues that need to be moved between statuses"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.statusMappings) body.statusMappings = args.statusMappings;

      const result = await logger.time(
        "tool.publish_workflow_scheme_draft",
        () =>
          client.request(
            `/rest/api/3/workflowscheme/${args.workflowSchemeId}/draft/publish`,
            { method: "POST", body: JSON.stringify(body) }
          ),
        { tool: "publish_workflow_scheme_draft" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── assign_workflow_scheme_to_project ─────────────────────────────────────
  server.registerTool(
    "assign_workflow_scheme_to_project",
    {
      title: "Assign Workflow Scheme to Project",
      description:
        "Assign a workflow scheme to a project. This changes the workflows used for all issue types in the project. Existing issues may need status migration.",
      inputSchema: {
        projectId: z.string().describe("Project ID"),
        workflowSchemeId: z.number().int().optional().describe("Workflow scheme ID to assign (omit to use default scheme)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = { projectId: args.projectId };
      if (args.workflowSchemeId) body.workflowSchemeId = String(args.workflowSchemeId);

      const result = await logger.time(
        "tool.assign_workflow_scheme_to_project",
        () =>
          client.put("/rest/api/3/workflowscheme/project", body),
        { tool: "assign_workflow_scheme_to_project" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_issue_type_workflow ───────────────────────────────────────────────
  server.registerTool(
    "get_issue_type_workflow",
    {
      title: "Get Workflow for Issue Type in Scheme",
      description:
        "Retrieve the workflow assigned to a specific issue type within a workflow scheme.",
      inputSchema: {
        workflowSchemeId: z.number().int().describe("Workflow scheme ID"),
        issueTypeId: z.string().describe("Issue type ID"),
        returnDraftIfExists: z
          .boolean()
          .optional()
          .describe("Return the draft workflow if a draft exists (default: false)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.returnDraftIfExists !== undefined)
        params.set("returnDraftIfExists", String(args.returnDraftIfExists));

      const result = await logger.time(
        "tool.get_issue_type_workflow",
        () =>
          client.get(
            `/rest/api/3/workflowscheme/${args.workflowSchemeId}/issuetype/${args.issueTypeId}?${params}`
          ),
        { tool: "get_issue_type_workflow" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
