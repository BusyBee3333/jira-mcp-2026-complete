// Versions tools: list_versions, create_version, update_version, release_version
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_versions ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_versions",
    {
      title: "List Project Versions",
      description:
        "List all versions (fix versions / release versions) for a Jira project. Returns version ID, name, description, release date, released status, and archived status. Useful for fix version assignment in issues.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
        orderBy: z
          .enum(["description", "-description", "name", "-name", "releaseDate", "-releaseDate", "sequence", "-sequence"])
          .optional()
          .describe("Sort order (prefix '-' for descending)"),
        query: z.string().optional().describe("Filter versions by name (partial match)"),
        status: z
          .enum(["released", "unreleased", "archived"])
          .optional()
          .describe("Filter by release status"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 50));
      if (args.orderBy) params.set("orderBy", args.orderBy as string);
      if (args.query) params.set("query", args.query as string);
      if (args.status) params.set("status", args.status as string);

      const result = await logger.time(
        "tool.list_versions",
        () => client.get(`/project/${args.projectKeyOrId}/version?${params}`),
        { tool: "list_versions", project: args.projectKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_version ─────────────────────────────────────────────────────────
  server.registerTool(
    "create_version",
    {
      title: "Create Project Version",
      description:
        "Create a new version (fix version / release) for a Jira project. Optionally set release date, description, and whether it's archived. Returns the new version ID.",
      inputSchema: {
        projectKeyOrId: z.string().describe("Project key (e.g. PROJ) or project ID"),
        name: z.string().describe("Version name (e.g. '1.0.0', 'Sprint 5 Release')"),
        description: z.string().optional().describe("Version description"),
        releaseDate: z
          .string()
          .optional()
          .describe("Release date in YYYY-MM-DD format (e.g. '2024-03-15')"),
        startDate: z.string().optional().describe("Start date in YYYY-MM-DD format"),
        archived: z.boolean().optional().describe("Whether the version is archived (default: false)"),
        released: z.boolean().optional().describe("Whether the version is already released (default: false)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        name: args.name,
        projectId: args.projectKeyOrId,
      };

      // If projectKeyOrId is numeric, use projectId; otherwise look it up by project field
      // The API expects projectId as a number, but we can also pass project key via `project` field
      if (/^\d+$/.test(String(args.projectKeyOrId))) {
        body.projectId = parseInt(String(args.projectKeyOrId), 10);
      } else {
        body.project = args.projectKeyOrId;
      }

      if (args.description) body.description = args.description;
      if (args.releaseDate) body.releaseDate = args.releaseDate;
      if (args.startDate) body.startDate = args.startDate;
      if (args.archived !== undefined) body.archived = args.archived;
      if (args.released !== undefined) body.released = args.released;

      const result = await logger.time(
        "tool.create_version",
        () => client.post("/version", body),
        { tool: "create_version", project: args.projectKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_version ─────────────────────────────────────────────────────────
  server.registerTool(
    "update_version",
    {
      title: "Update Project Version",
      description:
        "Update an existing project version. Change the name, description, release date, or archived/released status. Use list_versions to find version IDs.",
      inputSchema: {
        versionId: z.string().describe("Version ID (from list_versions)"),
        name: z.string().optional().describe("New version name"),
        description: z.string().optional().describe("New description"),
        releaseDate: z.string().optional().describe("New release date (YYYY-MM-DD)"),
        startDate: z.string().optional().describe("New start date (YYYY-MM-DD)"),
        archived: z.boolean().optional().describe("Set archived status"),
        released: z.boolean().optional().describe("Set released status"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.name) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;
      if (args.releaseDate) body.releaseDate = args.releaseDate;
      if (args.startDate) body.startDate = args.startDate;
      if (args.archived !== undefined) body.archived = args.archived;
      if (args.released !== undefined) body.released = args.released;

      const result = await logger.time(
        "tool.update_version",
        () => client.put(`/version/${args.versionId}`, body),
        { tool: "update_version", versionId: args.versionId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── release_version ────────────────────────────────────────────────────────
  server.registerTool(
    "release_version",
    {
      title: "Release Project Version",
      description:
        "Mark a project version as released. Optionally set the release date and specify how to handle unresolved issues (move to another version or ignore). Use list_versions to find version IDs.",
      inputSchema: {
        versionId: z.string().describe("Version ID to release (from list_versions)"),
        releaseDate: z
          .string()
          .optional()
          .describe("Release date in YYYY-MM-DD format (defaults to today)"),
        moveUnfixedIssuesTo: z
          .string()
          .optional()
          .describe("Version ID to move unresolved issues to (optional)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const today = new Date().toISOString().split("T")[0];
      const body: Record<string, unknown> = {
        released: true,
        releaseDate: args.releaseDate ?? today,
      };

      if (args.moveUnfixedIssuesTo) {
        body.moveUnfixedIssuesTo = `/rest/api/3/version/${args.moveUnfixedIssuesTo}`;
      }

      const result = await logger.time(
        "tool.release_version",
        () => client.put(`/version/${args.versionId}`, body),
        { tool: "release_version", versionId: args.versionId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
