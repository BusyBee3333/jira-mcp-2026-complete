#!/usr/bin/env node
// Jira MCP Server — Production Quality
// 102 tools covering projects, issues, sprints, boards, comments, users,
// worklogs, attachments, versions, components, custom fields, labels, priorities,
// service management (JSM), screens, issue types, permissions, filters, audit log,
// statuses, notification schemes, roadmap/epics
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
import { registerTools as registerBoardsTools } from "./tools/boards.js";
import { registerTools as registerWorklogsTools } from "./tools/worklogs.js";
import { registerTools as registerAttachmentsTools } from "./tools/attachments.js";
import { registerTools as registerVersionsTools } from "./tools/versions.js";
import { registerTools as registerComponentsTools } from "./tools/components.js";
import { registerTools as registerCustomFieldsTools } from "./tools/custom_fields.js";
import { registerTools as registerLabelsTools } from "./tools/labels.js";
import { registerTools as registerPrioritiesTools } from "./tools/priorities.js";
import { registerTools as registerServiceManagementTools } from "./tools/service_management.js";
import { registerTools as registerScreensTools } from "./tools/screens.js";
import { registerTools as registerIssueTypesTools } from "./tools/issue_types.js";
import { registerTools as registerPermissionsTools } from "./tools/permissions.js";
import { registerTools as registerFiltersTools } from "./tools/filters.js";
import { registerTools as registerAuditLogTools } from "./tools/audit_log.js";
import { registerTools as registerStatusesTools } from "./tools/statuses.js";
import { registerTools as registerNotificationSchemesTools } from "./tools/notification_schemes.js";
import { registerTools as registerRoadmapTools } from "./tools/roadmap.js";

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
  registerHealthTools(server, client);      // 1:  health_check
  registerProjectsTools(server, client);    // 5:  list_projects, get_project, get_project_statuses, list_project_roles, create_project
  registerIssuesTools(server, client);      // 11: list_issues, search_issues, get_issue, create_issue, update_issue, transition_issue, assign_issue, delete_issue, link_issues, clone_issue, bulk_create_issues
  registerCommentsTools(server, client);    // 2:  list_comments, add_comment
  registerSprintsTools(server, client);     // 6:  list_boards, list_sprints, get_sprint, update_sprint, close_sprint, move_issues_to_sprint
  registerUsersTools(server, client);       // 1:  get_user
  registerBoardsTools(server, client);      // 3:  get_board, get_board_configuration, list_board_sprints
  registerWorklogsTools(server, client);    // 4:  list_worklogs, add_worklog, update_worklog, delete_worklog
  registerAttachmentsTools(server, client); // 3:  list_attachments, get_attachment_content, delete_attachment
  registerVersionsTools(server, client);    // 4:  list_versions, create_version, update_version, release_version
  registerComponentsTools(server, client);  // 4:  list_components, create_component, update_component, delete_component
  registerCustomFieldsTools(server, client);// 4:  list_fields, get_field, list_field_contexts, get_field_options
  registerLabelsTools(server, client);               // 2:  list_labels, get_suggested_labels
  registerPrioritiesTools(server, client);           // 2:  list_priorities, get_priority
  registerServiceManagementTools(server, client);    // 6:  list_service_desks, get_service_desk, list_request_types, list_queues, get_queue_issues, list_sla_info
  registerScreensTools(server, client);              // 5:  list_screens, get_screen, list_screen_tabs, list_screen_tab_fields, add_field_to_screen
  registerIssueTypesTools(server, client);           // 5:  list_issue_types, get_issue_type, create_issue_type, update_issue_type, list_issue_type_schemes
  registerPermissionsTools(server, client);          // 3:  list_permission_schemes, get_permission_scheme, list_my_permissions
  registerFiltersTools(server, client);              // 6:  list_filters, get_filter, create_filter, update_filter, delete_filter, get_filter_columns
  registerAuditLogTools(server, client);             // 1:  get_audit_records
  registerStatusesTools(server, client);             // 3:  list_statuses, get_status, list_status_categories
  registerNotificationSchemesTools(server, client);  // 2:  list_notification_schemes, get_notification_scheme
  registerRoadmapTools(server, client);              // 5:  list_epics, get_epic, update_epic, list_epic_issues, move_issue_to_epic
  // Issues expansions: +5 (get_issue_changelog, list_issue_watchers, add_watcher, remove_watcher, get_issue_remote_links)
  // Projects expansions: +5 (update_project, delete_project, get_project_components, archive_project, list_recent_projects)
  // Users expansions: +4 (find_users_by_query, get_user_groups, list_all_users, get_account_ids)
  // Total: 102 tools

  logger.info("server.tools_registered", {
    count: 102,
    tools: [
      // Health (1)
      "health_check",
      // Projects (10)
      "list_projects", "get_project", "get_project_statuses", "list_project_roles", "create_project",
      "update_project", "delete_project", "get_project_components", "archive_project", "list_recent_projects",
      // Issues (16)
      "list_issues", "search_issues", "get_issue", "create_issue", "update_issue",
      "transition_issue", "assign_issue", "delete_issue", "link_issues", "clone_issue", "bulk_create_issues",
      "get_issue_changelog", "list_issue_watchers", "add_watcher", "remove_watcher", "get_issue_remote_links",
      // Comments (2)
      "list_comments", "add_comment",
      // Sprints (6)
      "list_boards", "list_sprints", "get_sprint", "update_sprint", "close_sprint", "move_issues_to_sprint",
      // Users (5)
      "get_user", "find_users_by_query", "get_user_groups", "list_all_users", "get_account_ids",
      // Boards (3)
      "get_board", "get_board_configuration", "list_board_sprints",
      // Worklogs (4)
      "list_worklogs", "add_worklog", "update_worklog", "delete_worklog",
      // Attachments (3)
      "list_attachments", "get_attachment_content", "delete_attachment",
      // Versions (4)
      "list_versions", "create_version", "update_version", "release_version",
      // Components (4)
      "list_components", "create_component", "update_component", "delete_component",
      // Custom Fields (4)
      "list_fields", "get_field", "list_field_contexts", "get_field_options",
      // Labels (2)
      "list_labels", "get_suggested_labels",
      // Priorities (2)
      "list_priorities", "get_priority",
      // Service Management / JSM (6)
      "list_service_desks", "get_service_desk", "list_request_types",
      "list_queues", "get_queue_issues", "list_sla_info",
      // Screens (5)
      "list_screens", "get_screen", "list_screen_tabs", "list_screen_tab_fields", "add_field_to_screen",
      // Issue Types (5)
      "list_issue_types", "get_issue_type", "create_issue_type", "update_issue_type", "list_issue_type_schemes",
      // Permissions (3)
      "list_permission_schemes", "get_permission_scheme", "list_my_permissions",
      // Filters (6)
      "list_filters", "get_filter", "create_filter", "update_filter", "delete_filter", "get_filter_columns",
      // Audit Log (1)
      "get_audit_records",
      // Statuses (3)
      "list_statuses", "get_status", "list_status_categories",
      // Notification Schemes (2)
      "list_notification_schemes", "get_notification_scheme",
      // Roadmap / Epics (5)
      "list_epics", "get_epic", "update_epic", "list_epic_issues", "move_issue_to_epic",
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
