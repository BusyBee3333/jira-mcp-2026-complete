// Myself tools: get_myself, update_myself, get_my_permissions
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_myself ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_myself",
    {
      title: "Get Current User (Myself)",
      description:
        "Get details about the currently authenticated Jira user. Returns account ID, display name, email, timezone, locale, account type, and application roles.",
      inputSchema: {
        expand: z.string().optional().describe("Expand additional fields (e.g. 'groups,applicationRoles')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);
      const qs = params.toString() ? `?${params}` : "";
      const result = await logger.time(
        "tool.get_myself",
        () => client.get(`/myself${qs}`),
        { tool: "get_myself" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_myself ─────────────────────────────────────────────────────────
  server.registerTool(
    "update_myself",
    {
      title: "Update Current User Profile",
      description:
        "Update profile properties for the currently authenticated user (display name, email, time zone, locale).",
      inputSchema: {
        displayName: z.string().optional().describe("New display name"),
        emailAddress: z.string().email().optional().describe("New email address"),
        timeZone: z.string().optional().describe("Time zone (e.g. 'America/New_York')"),
        locale: z.string().optional().describe("Locale code (e.g. 'en_US')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = {};
      if (args.displayName) payload.displayName = args.displayName;
      if (args.emailAddress) payload.emailAddress = args.emailAddress;
      if (args.timeZone) payload.timeZone = args.timeZone;
      if (args.locale) payload.locale = args.locale;
      const result = await logger.time(
        "tool.update_myself",
        () => client.put("/myself", payload),
        { tool: "update_myself" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── change_my_password ────────────────────────────────────────────────────
  server.registerTool(
    "change_my_password",
    {
      title: "Change My Password",
      description: "Change the password for the currently authenticated user.",
      inputSchema: {
        password: z.string().describe("New password"),
        currentPassword: z.string().optional().describe("Current password (required in some configurations)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = { password: args.password };
      if (args.currentPassword) payload.currentPassword = args.currentPassword;
      const result = await logger.time(
        "tool.change_my_password",
        () => client.put("/myself/password", payload),
        { tool: "change_my_password" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
