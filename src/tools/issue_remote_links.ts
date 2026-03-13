// Issue Remote Links tools: list_issue_remote_links, get_issue_remote_link, create_issue_remote_link, update_issue_remote_link, delete_issue_remote_link
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_issue_remote_links ───────────────────────────────────────────────
  server.registerTool(
    "list_issue_remote_links",
    {
      title: "List Issue Remote Links",
      description:
        "List all remote links for a Jira issue. Remote links are URLs pointing to external resources (e.g. GitHub PRs, Confluence pages). Returns ID, title, URL, status for each link.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        globalId: z.string().optional().describe("Filter by globalId string to find a specific remote link"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.globalId) params.set("globalId", args.globalId as string);
      const qs = params.toString() ? `?${params}` : "";
      const result = await logger.time(
        "tool.list_issue_remote_links",
        () => client.get(`/issue/${args.issueKeyOrId}/remotelink${qs}`),
        { tool: "list_issue_remote_links", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: { remoteLinks: result } as Record<string, unknown>,
      };
    }
  );

  // ── get_issue_remote_link ─────────────────────────────────────────────────
  server.registerTool(
    "get_issue_remote_link",
    {
      title: "Get Issue Remote Link",
      description: "Get a specific remote link on a Jira issue by its remote link ID.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID"),
        linkId: z.string().describe("The remote link ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_issue_remote_link",
        () => client.get(`/issue/${args.issueKeyOrId}/remotelink/${args.linkId}`),
        { tool: "get_issue_remote_link" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_issue_remote_link ──────────────────────────────────────────────
  server.registerTool(
    "create_issue_remote_link",
    {
      title: "Create Issue Remote Link",
      description:
        "Create a remote link on a Jira issue pointing to an external URL (e.g. a GitHub PR, Confluence page, or website). Returns the created remote link ID.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or ID"),
        url: z.string().url().describe("URL of the remote resource"),
        title: z.string().describe("Display title for the link"),
        summary: z.string().optional().describe("Short summary/description of the remote resource"),
        globalId: z.string().optional().describe("Unique identifier for deduplication (any string)"),
        statusResolved: z.boolean().optional().describe("Whether the linked item is resolved/done"),
        statusIcon: z.string().optional().describe("URL of a 16x16 icon representing the link status"),
        applicationType: z.string().optional().describe("Type of the linked application (e.g. 'com.atlassian.jira')"),
        applicationName: z.string().optional().describe("Name of the linked application (e.g. 'GitHub')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = {
        object: {
          url: args.url,
          title: args.title,
          ...(args.summary ? { summary: args.summary } : {}),
          ...(args.statusResolved !== undefined
            ? { status: { resolved: args.statusResolved, ...(args.statusIcon ? { icon: { url16x16: args.statusIcon } } : {}) } }
            : {}),
        },
      };
      if (args.globalId) payload.globalId = args.globalId;
      if (args.applicationType || args.applicationName) {
        payload.application = {
          ...(args.applicationType ? { type: args.applicationType } : {}),
          ...(args.applicationName ? { name: args.applicationName } : {}),
        };
      }
      const result = await logger.time(
        "tool.create_issue_remote_link",
        () => client.post(`/issue/${args.issueKeyOrId}/remotelink`, payload),
        { tool: "create_issue_remote_link", issue: args.issueKeyOrId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_issue_remote_link ──────────────────────────────────────────────
  server.registerTool(
    "update_issue_remote_link",
    {
      title: "Update Issue Remote Link",
      description: "Update an existing remote link on a Jira issue.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID"),
        linkId: z.string().describe("The remote link ID to update"),
        url: z.string().url().describe("New URL for the remote resource"),
        title: z.string().describe("New display title for the link"),
        summary: z.string().optional().describe("New summary/description"),
        globalId: z.string().optional().describe("Updated globalId for deduplication"),
        statusResolved: z.boolean().optional().describe("Whether the linked item is resolved"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = {
        object: {
          url: args.url,
          title: args.title,
          ...(args.summary ? { summary: args.summary } : {}),
          ...(args.statusResolved !== undefined ? { status: { resolved: args.statusResolved } } : {}),
        },
      };
      if (args.globalId) payload.globalId = args.globalId;
      const result = await logger.time(
        "tool.update_issue_remote_link",
        () => client.put(`/issue/${args.issueKeyOrId}/remotelink/${args.linkId}`, payload),
        { tool: "update_issue_remote_link" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_issue_remote_link ──────────────────────────────────────────────
  server.registerTool(
    "delete_issue_remote_link",
    {
      title: "Delete Issue Remote Link",
      description: "Delete a remote link from a Jira issue by its remote link ID.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID"),
        linkId: z.string().describe("The remote link ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_issue_remote_link",
        () => client.delete(`/issue/${args.issueKeyOrId}/remotelink/${args.linkId}`),
        { tool: "delete_issue_remote_link" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
