// Forge Apps tools: list_forge_installed_apps, get_forge_app_environments,
// list_forge_app_deployments, get_forge_app_storage, set_forge_app_storage,
// delete_forge_app_storage, query_forge_app_storage
// Uses Forge/Connect management APIs
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_installed_apps ───────────────────────────────────────────────────
  server.registerTool(
    "list_installed_apps",
    {
      title: "List Installed Apps (Connect/Forge)",
      description:
        "List all installed Atlassian Connect and Forge apps on the Jira instance. Returns app key, name, version, enabled status, and vendor information. Requires Jira administrator permissions.",
      inputSchema: {
        enabled: z.boolean().optional().describe("Filter: true = enabled apps only, false = disabled apps only"),
        userInstalled: z.boolean().optional().describe("Filter: true = user-installed apps only"),
        query: z.string().optional().describe("Filter apps by name (partial match)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.enabled !== undefined) params.set("enabled", String(args.enabled));
      if (args.userInstalled !== undefined)
        params.set("userInstalled", String(args.userInstalled));
      if (args.query) params.set("query", args.query as string);

      const result = await logger.time(
        "tool.list_installed_apps",
        () =>
          client.get(`/rest/plugins/1.0/?${params}`),
        { tool: "list_installed_apps" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_installed_app ─────────────────────────────────────────────────────
  server.registerTool(
    "get_installed_app",
    {
      title: "Get Installed App Details",
      description:
        "Retrieve detailed information about a specific installed app including its modules, version, vendor details, and configuration status.",
      inputSchema: {
        addonKey: z.string().describe("The app/addon key (e.g. 'com.atlassian.jira.jira-projects-plugin')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_installed_app",
        () =>
          client.get(`/rest/plugins/1.0/${args.addonKey}-key`),
        { tool: "get_installed_app" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── enable_app ────────────────────────────────────────────────────────────
  server.registerTool(
    "enable_app",
    {
      title: "Enable Installed App",
      description:
        "Enable a currently disabled Atlassian Connect or Forge app. Requires Jira administrator permissions.",
      inputSchema: {
        addonKey: z.string().describe("The app/addon key to enable"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.enable_app",
        () =>
          client.put(`/rest/plugins/1.0/${args.addonKey}-key/enabled`, { enabled: true }),
        { tool: "enable_app" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : `App '${args.addonKey}' enabled.`,
          },
        ],
      };
    }
  );

  // ── disable_app ───────────────────────────────────────────────────────────
  server.registerTool(
    "disable_app",
    {
      title: "Disable Installed App",
      description:
        "Disable an enabled Atlassian Connect or Forge app. The app remains installed but its functionality is suspended. Requires Jira administrator permissions.",
      inputSchema: {
        addonKey: z.string().describe("The app/addon key to disable"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.disable_app",
        () =>
          client.put(`/rest/plugins/1.0/${args.addonKey}-key/enabled`, { enabled: false }),
        { tool: "disable_app" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result ? JSON.stringify(result, null, 2) : `App '${args.addonKey}' disabled.`,
          },
        ],
      };
    }
  );

  // ── get_forge_storage ─────────────────────────────────────────────────────
  server.registerTool(
    "get_forge_app_storage",
    {
      title: "Get Forge App Storage Value",
      description:
        "Retrieve a value from the Forge app custom storage API. Forge apps use this API to persist data in Atlassian's managed storage.",
      inputSchema: {
        appId: z.string().describe("Forge app ID"),
        environmentKey: z.string().describe("App environment key (e.g. 'development', 'staging', 'production')"),
        key: z.string().describe("Storage key to retrieve"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_forge_app_storage",
        () =>
          client.get(
            `/rest/forge/1/app/${args.appId}/environment/${args.environmentKey}/storage/custom-field/${args.key}`
          ),
        { tool: "get_forge_app_storage" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── list_forge_app_environments ───────────────────────────────────────────
  server.registerTool(
    "list_forge_app_environments",
    {
      title: "List Forge App Environments",
      description:
        "List all environments for a Forge app. Returns environment keys (development, staging, production) and their deployment status.",
      inputSchema: {
        appId: z.string().describe("Forge app ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.list_forge_app_environments",
        () =>
          client.get(`/rest/forge/1/app/${args.appId}/environments`),
        { tool: "list_forge_app_environments" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
