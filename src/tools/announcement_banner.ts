// Announcement Banner tools: get_announcement_banner, set_announcement_banner
// Uses Jira Cloud REST API v3 (/rest/api/3/announcementBanner)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_announcement_banner ───────────────────────────────────────────────
  server.registerTool(
    "get_announcement_banner",
    {
      title: "Get Announcement Banner",
      description:
        "Retrieve the current announcement banner configuration for the Jira instance. Returns the banner message, visibility (public/private), and whether it is enabled. Requires Jira administrator permissions.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.get_announcement_banner",
        () => client.get("/rest/api/3/announcementBanner"),
        { tool: "get_announcement_banner" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── set_announcement_banner ───────────────────────────────────────────────
  server.registerTool(
    "set_announcement_banner",
    {
      title: "Set Announcement Banner",
      description:
        "Create or update the Jira instance announcement banner. The banner appears at the top of every Jira page. Requires Jira administrator permissions.",
      inputSchema: {
        message: z
          .string()
          .describe("Banner message text (supports plain text or basic HTML)"),
        visibility: z
          .enum(["PUBLIC", "PRIVATE"])
          .describe(
            "PUBLIC: visible to all users including logged-out visitors. PRIVATE: visible only to logged-in users."
          ),
        isDismissible: z
          .boolean()
          .optional()
          .describe("Whether users can dismiss the banner (default: false)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        message: args.message,
        visibility: args.visibility,
      };
      if (args.isDismissible !== undefined) body.isDismissible = args.isDismissible;

      const result = await logger.time(
        "tool.set_announcement_banner",
        () =>
          client.request("/rest/api/3/announcementBanner", {
            method: "PUT",
            body: JSON.stringify(body),
          }),
        { tool: "set_announcement_banner" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : "Announcement banner updated successfully.",
          },
        ],
      };
    }
  );
}
