// Attachments tools: list_attachments, get_attachment_content, delete_attachment
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_attachments ───────────────────────────────────────────────────────
  server.registerTool(
    "list_attachments",
    {
      title: "List Issue Attachments",
      description:
        "List all attachments on a Jira issue. Returns attachment ID, filename, size, MIME type, author, and created date. Use the attachment ID with get_attachment_content to retrieve metadata including download URL.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const issue = await logger.time(
        "tool.list_attachments",
        () => client.get<{ fields: { attachment: unknown[] } }>(
          `/issue/${args.issueKeyOrId}?fields=attachment`
        ),
        { tool: "list_attachments", issue: args.issueKeyOrId as string }
      );

      const attachments = issue.fields?.attachment ?? [];
      const result = {
        issueKey: args.issueKeyOrId,
        total: attachments.length,
        attachments,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_attachment_content ─────────────────────────────────────────────────
  server.registerTool(
    "get_attachment_content",
    {
      title: "Get Attachment Metadata",
      description:
        "Get metadata for a specific attachment by ID, including filename, MIME type, size, author, and the direct download URL. Use list_attachments to find attachment IDs.",
      inputSchema: {
        attachmentId: z.string().describe("Attachment ID (from list_attachments)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_attachment_content",
        () => client.get(`/attachment/${args.attachmentId}`),
        { tool: "get_attachment_content", attachmentId: args.attachmentId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_attachment ──────────────────────────────────────────────────────
  server.registerTool(
    "delete_attachment",
    {
      title: "Delete Attachment",
      description:
        "Permanently delete an attachment from a Jira issue. This action cannot be undone. Use list_attachments to find attachment IDs.",
      inputSchema: {
        attachmentId: z.string().describe("Attachment ID to delete (from list_attachments)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      await logger.time(
        "tool.delete_attachment",
        () => client.delete(`/attachment/${args.attachmentId}`),
        { tool: "delete_attachment", attachmentId: args.attachmentId as string }
      );

      const result = { success: true, attachmentId: args.attachmentId };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
