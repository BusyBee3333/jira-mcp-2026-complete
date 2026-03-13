// Project Email tools: get_project_email, update_project_email
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_project_email ─────────────────────────────────────────────────────
  server.registerTool(
    "get_project_email",
    {
      title: "Get Project Email Address",
      description:
        "Retrieve the sender email address for a project. This is the 'From' address used in notifications sent from the project. Requires project administrator permissions.",
      inputSchema: {
        projectId: z.number().int().describe("Project ID (numeric, e.g. 10001)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_project_email",
        () => client.get(`/rest/api/3/project/${args.projectId}/email`),
        { tool: "get_project_email" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_project_email ──────────────────────────────────────────────────
  server.registerTool(
    "update_project_email",
    {
      title: "Update Project Email Address",
      description:
        "Set the sender email address for a project's outbound notifications. The email address must be one of the allowed custom senders configured in the Jira instance. Requires project administrator permissions.",
      inputSchema: {
        projectId: z.number().int().describe("Project ID"),
        emailAddress: z
          .string()
          .optional()
          .describe(
            "New email address to use as the project sender. Leave empty to reset to the Jira default."
          ),
        emailAddressStatus: z
          .array(z.string())
          .optional()
          .describe("Status list for the email address (informational)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.emailAddress !== undefined) body.emailAddress = args.emailAddress;
      if (args.emailAddressStatus) body.emailAddressStatus = args.emailAddressStatus;

      const result = await logger.time(
        "tool.update_project_email",
        () =>
          client.put(`/rest/api/3/project/${args.projectId}/email`, body),
        { tool: "update_project_email" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Project email updated successfully.",
          },
        ],
      };
    }
  );

  // ── get_project_issue_security_scheme ─────────────────────────────────────
  server.registerTool(
    "get_project_issue_security_scheme",
    {
      title: "Get Project Issue Security Scheme",
      description:
        "Retrieve the issue security scheme assigned to a project. Issue security schemes restrict issue visibility to specific users, groups, or roles.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. 'PROJ') or project ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_project_issue_security_scheme",
        () =>
          client.get(
            `/rest/api/3/project/${args.projectKeyOrId}/issuesecuritylevelscheme`
          ),
        { tool: "get_project_issue_security_scheme" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_project_hierarchy ─────────────────────────────────────────────────
  server.registerTool(
    "get_project_hierarchy",
    {
      title: "Get Project Issue Type Hierarchy",
      description:
        "Retrieve the issue type hierarchy for a project. Returns all configured hierarchy levels from Epic down to Sub-task with their associated issue type IDs.",
      inputSchema: {
        projectId: z.number().int().describe("Project ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_project_hierarchy",
        () =>
          client.get(`/rest/api/3/project/${args.projectId}/hierarchy`),
        { tool: "get_project_hierarchy" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
