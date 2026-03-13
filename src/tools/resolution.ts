// Resolution tools: list_resolutions, get_resolution, create_resolution, update_resolution, delete_resolution, set_default_resolution, move_resolutions
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_resolutions ──────────────────────────────────────────────────────
  server.registerTool(
    "list_resolutions",
    {
      title: "List Resolutions",
      description:
        "List all issue resolutions defined in Jira (e.g. Fixed, Won't Fix, Duplicate, Cannot Reproduce). Returns ID, name, description for each resolution.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.list_resolutions",
        () => client.get("/resolution/search"),
        { tool: "list_resolutions" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_resolution ────────────────────────────────────────────────────────
  server.registerTool(
    "get_resolution",
    {
      title: "Get Resolution",
      description: "Get details of a specific issue resolution by its ID.",
      inputSchema: {
        resolutionId: z.string().describe("Resolution ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_resolution",
        () => client.get(`/resolution/${args.resolutionId}`),
        { tool: "get_resolution" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_resolution ─────────────────────────────────────────────────────
  server.registerTool(
    "create_resolution",
    {
      title: "Create Resolution",
      description: "Create a new issue resolution in Jira.",
      inputSchema: {
        name: z.string().describe("Name of the new resolution"),
        description: z.string().optional().describe("Description of the resolution"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: Record<string, unknown> = { name: args.name };
      if (args.description) payload.description = args.description;
      const result = await logger.time(
        "tool.create_resolution",
        () => client.post("/resolution", payload),
        { tool: "create_resolution" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_resolution ─────────────────────────────────────────────────────
  server.registerTool(
    "update_resolution",
    {
      title: "Update Resolution",
      description: "Update the name or description of an existing resolution.",
      inputSchema: {
        resolutionId: z.string().describe("Resolution ID to update"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("New description"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = {};
      if (args.name) payload.name = args.name;
      if (args.description !== undefined) payload.description = args.description;
      const result = await logger.time(
        "tool.update_resolution",
        () => client.put(`/resolution/${args.resolutionId}`, payload),
        { tool: "update_resolution" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── delete_resolution ─────────────────────────────────────────────────────
  server.registerTool(
    "delete_resolution",
    {
      title: "Delete Resolution",
      description: "Delete a resolution. Issues with this resolution will have their resolution field cleared or swapped.",
      inputSchema: {
        resolutionId: z.string().describe("Resolution ID to delete"),
        replaceWith: z.string().optional().describe("Resolution ID to replace this one with for existing issues"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.replaceWith) params.set("replaceWith", args.replaceWith as string);
      const qs = params.toString() ? `?${params}` : "";
      const result = await logger.time(
        "tool.delete_resolution",
        () => client.delete(`/resolution/${args.resolutionId}${qs}`),
        { tool: "delete_resolution" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── set_default_resolution ────────────────────────────────────────────────
  server.registerTool(
    "set_default_resolution",
    {
      title: "Set Default Resolution",
      description: "Set the default resolution used when issues are resolved.",
      inputSchema: {
        resolutionId: z.string().describe("Resolution ID to set as default"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.set_default_resolution",
        () => client.put("/resolution/default", { id: args.resolutionId }),
        { tool: "set_default_resolution" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
