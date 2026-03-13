// Issue Links tools: list_issue_link_types, get_issue_link_type, create_issue_link_type, update_issue_link_type, delete_issue_link_type, get_issue_link, create_issue_link, delete_issue_link
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_issue_link_types ─────────────────────────────────────────────────
  server.registerTool(
    "list_issue_link_types",
    {
      title: "List Issue Link Types",
      description:
        "List all issue link types defined in the Jira instance (e.g. Blocks, Clones, Duplicates, Relates). Returns ID, name, inward/outward description. Use before creating issue links.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.list_issue_link_types",
        () => client.get("/issueLinkType"),
        { tool: "list_issue_link_types" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_issue_link_type ───────────────────────────────────────────────────
  server.registerTool(
    "get_issue_link_type",
    {
      title: "Get Issue Link Type",
      description: "Get details of a specific issue link type by ID.",
      inputSchema: {
        issueLinkTypeId: z.string().describe("Issue link type ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_issue_link_type",
        () => client.get(`/issueLinkType/${args.issueLinkTypeId}`),
        { tool: "get_issue_link_type" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_issue_link_type ────────────────────────────────────────────────
  server.registerTool(
    "create_issue_link_type",
    {
      title: "Create Issue Link Type",
      description: "Create a new issue link type with inward and outward descriptions.",
      inputSchema: {
        name: z.string().describe("Name of the link type (e.g. 'Custom Link')"),
        inward: z.string().describe("Inward description (e.g. 'is blocked by')"),
        outward: z.string().describe("Outward description (e.g. 'blocks')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.create_issue_link_type",
        () => client.post("/issueLinkType", { name: args.name, inward: args.inward, outward: args.outward }),
        { tool: "create_issue_link_type" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_issue_link_type ────────────────────────────────────────────────
  server.registerTool(
    "update_issue_link_type",
    {
      title: "Update Issue Link Type",
      description: "Update an existing issue link type name, inward, or outward descriptions.",
      inputSchema: {
        issueLinkTypeId: z.string().describe("Issue link type ID"),
        name: z.string().optional().describe("New name"),
        inward: z.string().optional().describe("New inward description"),
        outward: z.string().optional().describe("New outward description"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = {};
      if (args.name) payload.name = args.name;
      if (args.inward) payload.inward = args.inward;
      if (args.outward) payload.outward = args.outward;
      const result = await logger.time(
        "tool.update_issue_link_type",
        () => client.put(`/issueLinkType/${args.issueLinkTypeId}`, payload),
        { tool: "update_issue_link_type" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_issue_link_type ────────────────────────────────────────────────
  server.registerTool(
    "delete_issue_link_type",
    {
      title: "Delete Issue Link Type",
      description: "Delete an issue link type by ID. This removes the type and all links of this type.",
      inputSchema: {
        issueLinkTypeId: z.string().describe("Issue link type ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_issue_link_type",
        () => client.delete(`/issueLinkType/${args.issueLinkTypeId}`),
        { tool: "delete_issue_link_type" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_issue_link ────────────────────────────────────────────────────────
  server.registerTool(
    "get_issue_link",
    {
      title: "Get Issue Link",
      description: "Get a specific issue link by its ID. Returns the link type, inward issue, and outward issue.",
      inputSchema: {
        linkId: z.string().describe("The issue link ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_issue_link",
        () => client.get(`/issueLink/${args.linkId}`),
        { tool: "get_issue_link" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_issue_link ─────────────────────────────────────────────────────
  server.registerTool(
    "create_issue_link",
    {
      title: "Create Issue Link",
      description:
        "Create a link between two Jira issues. Requires a link type name (e.g. 'Blocks', 'Relates') and issue keys for both ends. Use list_issue_link_types to find valid link type names.",
      inputSchema: {
        linkType: z.string().describe("Link type name (e.g. 'Blocks', 'Clones', 'Relates')"),
        inwardIssueKey: z.string().describe("Key of the inward issue (e.g. PROJ-10)"),
        outwardIssueKey: z.string().describe("Key of the outward issue (e.g. PROJ-20)"),
        comment: z.string().optional().describe("Optional comment to add when creating the link"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = {
        type: { name: args.linkType },
        inwardIssue: { key: args.inwardIssueKey },
        outwardIssue: { key: args.outwardIssueKey },
      };
      if (args.comment) {
        payload.comment = {
          body: {
            type: "doc",
            version: 1,
            content: [{ type: "paragraph", content: [{ type: "text", text: args.comment }] }],
          },
        };
      }
      const result = await logger.time(
        "tool.create_issue_link",
        () => client.post("/issueLink", payload),
        { tool: "create_issue_link" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_issue_link ─────────────────────────────────────────────────────
  server.registerTool(
    "delete_issue_link",
    {
      title: "Delete Issue Link",
      description: "Delete a specific issue link by its link ID. The link ID is found in the issue's issuelinks field.",
      inputSchema: {
        linkId: z.string().describe("The issue link ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_issue_link",
        () => client.delete(`/issueLink/${args.linkId}`),
        { tool: "delete_issue_link" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
