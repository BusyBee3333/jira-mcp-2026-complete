// Avatars tools: list_system_avatars, get_avatars, delete_avatar
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_system_avatars ───────────────────────────────────────────────────
  server.registerTool(
    "list_system_avatars",
    {
      title: "List System Avatars",
      description:
        "List all system avatars available in Jira for a given entity type (user, project, issuetype). Returns avatar IDs and URLs at various sizes.",
      inputSchema: {
        type: z
          .enum(["issuetype", "project", "user"])
          .describe("Avatar entity type"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.list_system_avatars",
        () => client.get(`/avatar/${args.type}/system`),
        { tool: "list_system_avatars" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_avatars ───────────────────────────────────────────────────────────
  server.registerTool(
    "get_avatars",
    {
      title: "Get Avatars for Entity",
      description:
        "Get all avatars (system and custom) for a specific entity (e.g. a specific project or user). Returns both system and custom avatars with IDs, isSystem flag, and URLs.",
      inputSchema: {
        type: z
          .enum(["issuetype", "project", "user"])
          .describe("Entity type"),
        entityId: z.string().describe("Entity ID (e.g. project ID, user account ID, issue type ID)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_avatars",
        () => client.get(`/universal_avatar/type/${args.type}/owner/${args.entityId}`),
        { tool: "get_avatars" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_avatar ─────────────────────────────────────────────────────────
  server.registerTool(
    "delete_avatar",
    {
      title: "Delete Avatar",
      description: "Delete a custom avatar. System avatars cannot be deleted.",
      inputSchema: {
        type: z
          .enum(["issuetype", "project", "user"])
          .describe("Entity type the avatar belongs to"),
        owningObjectId: z.string().describe("ID of the entity that owns the avatar (e.g. project ID)"),
        id: z.number().int().describe("Avatar ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.delete_avatar",
        () => client.delete(`/universal_avatar/type/${args.type}/owner/${args.owningObjectId}/avatar/${args.id}`),
        { tool: "delete_avatar" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_avatar_image_by_id ────────────────────────────────────────────────
  server.registerTool(
    "get_avatar_image_by_id",
    {
      title: "Get Avatar Image URL by ID",
      description: "Get the image URL for a specific avatar by type, entity, and avatar ID.",
      inputSchema: {
        type: z
          .enum(["issuetype", "project", "user"])
          .describe("Entity type"),
        entityId: z.string().describe("Entity ID"),
        size: z
          .enum(["xsmall", "small", "medium", "large", "xlarge"])
          .optional()
          .describe("Avatar size (default: medium)"),
        format: z.enum(["png", "svg"]).optional().describe("Image format (default: png)"),
        id: z.number().int().describe("Avatar ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.size) params.set("size", args.size as string);
      if (args.format) params.set("format", args.format as string);
      const qs = params.toString() ? `?${params}` : "";
      const url = `/universal_avatar/view/type/${args.type}/avatar/${args.id}${qs}`;
      const result = await logger.time(
        "tool.get_avatar_image_by_id",
        () => client.get(url),
        { tool: "get_avatar_image_by_id" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ avatarUrl: url, result }, null, 2) }],
        structuredContent: { avatarUrl: url } as Record<string, unknown>,
      };
    }
  );
}
