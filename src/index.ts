#!/usr/bin/env node
// Jira MCP Server — Production Quality
// 16 tools covering projects, issues, sprints, boards, comments, users
// Transport: stdio (default) or HTTP (MCP_TRANSPORT=http)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { JiraClient } from "./client.js";
import { logger } from "./logger.js";

// Tool group registrars
import { registerTools as registerHealthTools } from "./tools/health.js";
import { registerTools as registerProjectsTools } from "./tools/projects.js";
import { registerTools as registerIssuesTools } from "./tools/issues.js";
import { registerTools as registerCommentsTools } from "./tools/comments.js";
import { registerTools as registerSprintsTools } from "./tools/sprints.js";
import { registerTools as registerUsersTools } from "./tools/users.js";

const MCP_NAME = "jira";
const MCP_VERSION = "1.0.0";

async function main() {
  // ── Validate environment ─────────────────────────────────────────────────
  const baseUrl = process.env.JIRA_BASE_URL;
  const userEmail = process.env.JIRA_USER_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !userEmail || !apiToken) {
    const missing = [
      !baseUrl && "JIRA_BASE_URL",
      !userEmail && "JIRA_USER_EMAIL",
      !apiToken && "JIRA_API_TOKEN",
    ].filter(Boolean);
    logger.error("startup.missing_env", { missing });
    console.error(`Error: Missing required environment variables: ${missing.join(", ")}`);
    console.error("Copy .env.example to .env and fill in your Jira credentials.");
    console.error("  JIRA_BASE_URL     — e.g. https://yoursite.atlassian.net");
    console.error("  JIRA_USER_EMAIL   — your Atlassian account email");
    console.error("  JIRA_API_TOKEN    — from https://id.atlassian.com/manage-profile/security/api-tokens");
    process.exit(1);
  }

  // ── Initialize client ────────────────────────────────────────────────────
  const client = new JiraClient(baseUrl, userEmail, apiToken);

  // ── Create MCP server ────────────────────────────────────────────────────
  const server = new McpServer({
    name: `${MCP_NAME}-mcp`,
    version: MCP_VERSION,
  });

  // ── Register all tool groups ─────────────────────────────────────────────
  registerHealthTools(server, client);   // 1: health_check
  registerProjectsTools(server, client); // 2: list_projects, get_project
  registerIssuesTools(server, client);   // 7: list_issues, search_issues, get_issue, create_issue, update_issue, transition_issue, assign_issue
  registerCommentsTools(server, client); // 2: list_comments, add_comment
  registerSprintsTools(server, client);  // 3: list_boards, list_sprints, get_sprint
  registerUsersTools(server, client);    // 1: get_user
  // Total: 16 tools

  logger.info("server.tools_registered", {
    count: 16,
    tools: [
      "health_check",
      "list_projects", "get_project",
      "list_issues", "search_issues", "get_issue", "create_issue", "update_issue", "transition_issue", "assign_issue",
      "list_comments", "add_comment",
      "list_boards", "list_sprints", "get_sprint",
      "get_user",
    ],
  });

  // ── Start transport ──────────────────────────────────────────────────────
  const transportMode = process.env.MCP_TRANSPORT || "stdio";

  if (transportMode === "http") {
    await startHttpTransport(server);
  } else {
    await startStdioTransport(server);
  }
}

async function startStdioTransport(server: McpServer) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("server.started", { transport: "stdio", name: MCP_NAME, version: MCP_VERSION });
}

async function startHttpTransport(server: McpServer) {
  // Dynamic import to avoid loading HTTP deps in stdio mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const httpMod = await import("@modelcontextprotocol/sdk/server/streamableHttp.js") as any;
  const TransportClass = httpMod.StreamableHTTPServerTransport
    || httpMod.NodeStreamableHTTPServerTransport;

  if (!TransportClass) {
    throw new Error("HTTP transport class not found in MCP SDK. Ensure @modelcontextprotocol/sdk >=1.26.0");
  }

  const { createServer } = await import("http");
  const { randomUUID } = await import("crypto");

  const port = parseInt(process.env.MCP_HTTP_PORT || "3000", 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = new Map<string, any>();
  const sessionActivity = new Map<string, number>();
  const SESSION_TTL_MS = 30 * 60 * 1000;

  // Cleanup expired sessions every 60s
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, lastActive] of sessionActivity.entries()) {
      if (now - lastActive > SESSION_TTL_MS) {
        sessions.delete(id);
        sessionActivity.delete(id);
        logger.info("session.expired", { sessionId: id });
      }
    }
  }, 60_000);

  const httpServer = createServer(async (req: import("http").IncomingMessage, res: import("http").ServerResponse) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);

    // Health endpoint
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        server: MCP_NAME,
        version: MCP_VERSION,
        activeSessions: sessions.size,
      }));
      return;
    }

    if (url.pathname !== "/mcp") {
      res.writeHead(404);
      res.end();
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (req.method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let transport: any;
      if (sessionId && sessions.has(sessionId)) {
        transport = sessions.get(sessionId);
        sessionActivity.set(sessionId, Date.now());
      } else {
        const newId = randomUUID();
        transport = new TransportClass({ sessionIdGenerator: () => newId });
        await server.connect(transport);
        sessions.set(newId, transport);
        sessionActivity.set(newId, Date.now());
        logger.info("session.created", { sessionId: newId });
      }
      await transport.handleRequest(req, res);
    } else if (req.method === "GET" && sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId);
      sessionActivity.set(sessionId, Date.now());
      await transport.handleRequest(req, res);
    } else if (req.method === "DELETE" && sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId);
      await transport.handleRequest(req, res);
      sessions.delete(sessionId);
      sessionActivity.delete(sessionId);
      logger.info("session.deleted", { sessionId });
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid request or missing session ID" }));
    }
  });

  process.on("SIGTERM", () => {
    clearInterval(cleanupInterval);
    sessions.clear();
    httpServer.close();
  });

  httpServer.listen(port, () => {
    logger.info("server.started", {
      transport: "http",
      name: MCP_NAME,
      version: MCP_VERSION,
      port,
      endpoint: "/mcp",
      health: "/health",
    });
    console.error(`Jira MCP Server listening on http://localhost:${port}/mcp`);
  });
}

main().catch((error) => {
  logger.error("server.fatal", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
