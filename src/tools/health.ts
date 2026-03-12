// Health check tool for Jira MCP Server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  server.registerTool(
    "health_check",
    {
      title: "Health Check",
      description:
        "Validate Jira MCP server health: checks environment variables are set (JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN), the Jira API is reachable, and credentials are valid. Use when diagnosing connection issues or verifying server setup.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const required = ["JIRA_BASE_URL", "JIRA_USER_EMAIL", "JIRA_API_TOKEN"];
      const missing = required.filter((v) => !process.env[v]);
      const envOk = missing.length === 0;

      const health = await client.healthCheck();

      const status =
        !envOk || !health.reachable
          ? "unhealthy"
          : !health.authenticated
          ? "degraded"
          : "healthy";

      const result = {
        status,
        checks: {
          envVars: { ok: envOk, missing },
          apiReachable: health.reachable,
          authValid: health.authenticated,
          latencyMs: health.latencyMs,
        },
        baseUrl: process.env.JIRA_BASE_URL || "(not set)",
        ...(health.error ? { error: health.error } : {}),
      };

      logger.info("health_check", { status });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );
}
