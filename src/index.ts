#!/usr/bin/env node
// Jira MCP Server — Production Quality
// 200+ tools covering the full Jira Cloud REST API v3:
// projects, issues, sprints, boards, comments, users, worklogs, attachments,
// versions, components, custom fields, labels, priorities, service management (JSM),
// screens, issue types, permissions, filters, audit log, statuses, notification schemes,
// roadmap/epics, issue links, issue properties, remote links, votes, watchers,
// dashboards, groups, JQL, myself, project categories, features, properties, roles,
// project types, resolutions, server info, tasks, time tracking, user properties,
// user search, webhooks, field configurations, issue type schemes, issue security,
// workflow, avatars, and bulk operations.
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
// V2: Expanded tool modules — full Jira Cloud API coverage
import { registerTools as registerIssueLinksTools } from "./tools/issue_links.js";
import { registerTools as registerIssuePropertiesTools } from "./tools/issue_properties.js";
import { registerTools as registerIssueRemoteLinksTools } from "./tools/issue_remote_links.js";
import { registerTools as registerIssueVotesTools } from "./tools/issue_votes.js";
import { registerTools as registerIssueWatchersTools } from "./tools/issue_watchers.js";
import { registerTools as registerDashboardsTools } from "./tools/dashboards.js";
import { registerTools as registerGroupsTools } from "./tools/groups.js";
import { registerTools as registerJqlTools } from "./tools/jql.js";
import { registerTools as registerMyselfTools } from "./tools/myself.js";
import { registerTools as registerProjectCategoriesTools } from "./tools/project_categories.js";
import { registerTools as registerProjectFeaturesTools } from "./tools/project_features.js";
import { registerTools as registerProjectPropertiesTools } from "./tools/project_properties.js";
import { registerTools as registerProjectRolesDetailTools } from "./tools/project_roles_detail.js";
import { registerTools as registerProjectTypesTools } from "./tools/project_types.js";
import { registerTools as registerResolutionTools } from "./tools/resolution.js";
import { registerTools as registerServerInfoTools } from "./tools/server_info.js";
import { registerTools as registerTasksTools } from "./tools/tasks.js";
import { registerTools as registerTimeTrackingTools } from "./tools/time_tracking.js";
import { registerTools as registerUserPropertiesTools } from "./tools/user_properties.js";
import { registerTools as registerUserSearchTools } from "./tools/user_search.js";
import { registerTools as registerWebhooksTools } from "./tools/webhooks.js";
import { registerTools as registerFieldConfigurationsTools } from "./tools/field_configurations.js";
import { registerTools as registerIssueTypeSchemesTools } from "./tools/issue_type_schemes.js";
import { registerTools as registerIssueSecurityTools } from "./tools/issue_security.js";
import { registerTools as registerWorkflowTools } from "./tools/workflow.js";
import { registerTools as registerAvatarsTools } from "./tools/avatars.js";
import { registerTools as registerBulkOperationsTools } from "./tools/bulk_operations.js";

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
  // V2: Expanded tool modules
  registerIssueLinksTools(server, client);           // 8:  list_issue_link_types, get_issue_link_type, create_issue_link_type, update_issue_link_type, delete_issue_link_type, get_issue_link, create_issue_link, delete_issue_link
  registerIssuePropertiesTools(server, client);      // 4:  list_issue_properties, get_issue_property, set_issue_property, delete_issue_property
  registerIssueRemoteLinksTools(server, client);     // 5:  list_issue_remote_links, get_issue_remote_link, create_issue_remote_link, update_issue_remote_link, delete_issue_remote_link
  registerIssueVotesTools(server, client);           // 3:  get_issue_votes, add_vote, remove_vote
  registerIssueWatchersTools(server, client);        // 3:  get_issue_watchers, add_watcher, remove_watcher
  registerDashboardsTools(server, client);           // 7:  list_dashboards, search_dashboards, get_dashboard, create_dashboard, update_dashboard, delete_dashboard, copy_dashboard
  registerGroupsTools(server, client);               // 8:  get_group, create_group, delete_group, find_groups, get_group_members, add_user_to_group, remove_user_from_group, bulk_get_groups
  registerJqlTools(server, client);                  // 5:  parse_jql, sanitize_jql, get_jql_autocomplete_data, get_jql_autocomplete_suggestions, match_issues_to_jql
  registerMyselfTools(server, client);               // 3:  get_myself, update_myself, change_my_password
  registerProjectCategoriesTools(server, client);    // 5:  list_project_categories, get_project_category, create_project_category, update_project_category, delete_project_category
  registerProjectFeaturesTools(server, client);      // 2:  list_project_features, toggle_project_feature
  registerProjectPropertiesTools(server, client);    // 4:  list_project_properties, get_project_property, set_project_property, delete_project_property
  registerProjectRolesDetailTools(server, client);   // 8:  list_all_project_roles, get_project_role_by_id, create_project_role, update_project_role, delete_project_role, get_project_role_actors, add_actors_to_project_role, remove_actor_from_project_role
  registerProjectTypesTools(server, client);         // 3:  list_project_types, get_accessible_project_types, get_project_type_by_key
  registerResolutionTools(server, client);           // 6:  list_resolutions, get_resolution, create_resolution, update_resolution, delete_resolution, set_default_resolution
  registerServerInfoTools(server, client);           // 6:  get_server_info, get_license, get_application_roles, get_application_role, get_status_categories, get_status_category
  registerTasksTools(server, client);                // 2:  get_task, cancel_task
  registerTimeTrackingTools(server, client);         // 5:  get_time_tracking_config, update_time_tracking_config, list_time_tracking_providers, select_time_tracking_provider, disable_time_tracking
  registerUserPropertiesTools(server, client);       // 6:  list_user_properties, get_user_property, set_user_property, delete_user_property, get_user_columns, reset_user_columns
  registerUserSearchTools(server, client);           // 5:  find_users_for_picker, find_users_assignable_to_projects, find_users_with_permissions, bulk_get_users, find_users_by_property
  registerWebhooksTools(server, client);             // 5:  list_webhooks, register_webhooks, delete_webhooks, get_failed_webhooks, refresh_webhooks
  registerFieldConfigurationsTools(server, client);  // 7:  list_field_configurations, create_field_configuration, update_field_configuration, delete_field_configuration, list_field_configuration_items, update_field_configuration_items, list_field_configuration_schemes
  registerIssueTypeSchemesTools(server, client);     // 7:  list_issue_type_schemes, create_issue_type_scheme, update_issue_type_scheme, delete_issue_type_scheme, list_issue_type_scheme_items, list_projects_for_issue_type_scheme, assign_issue_type_scheme_to_project
  registerIssueSecurityTools(server, client);        // 5:  list_issue_security_schemes, get_issue_security_scheme, list_issue_security_levels, get_issue_security_level, list_project_security_levels
  registerWorkflowTools(server, client);             // 6:  list_workflows, get_workflow, create_workflow, delete_workflow, list_workflow_schemes, get_workflow_scheme
  registerAvatarsTools(server, client);              // 4:  list_system_avatars, get_avatars, delete_avatar, get_avatar_image_by_id
  registerBulkOperationsTools(server, client);       // 5:  get_bulk_edit_fields, bulk_edit_issues, get_bulk_transition_statuses, bulk_transition_issues, bulk_delete_issues

  logger.info("server.tools_registered", {
    count: 200,
    version: "v2",
    modules: 50,
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
      // V2: Issue Links (8)
      "list_issue_link_types", "get_issue_link_type", "create_issue_link_type", "update_issue_link_type",
      "delete_issue_link_type", "get_issue_link", "create_issue_link", "delete_issue_link",
      // V2: Issue Properties (4)
      "list_issue_properties", "get_issue_property", "set_issue_property", "delete_issue_property",
      // V2: Issue Remote Links (5)
      "list_issue_remote_links", "get_issue_remote_link", "create_issue_remote_link",
      "update_issue_remote_link", "delete_issue_remote_link",
      // V2: Issue Votes (3)
      "get_issue_votes", "add_vote", "remove_vote",
      // V2: Issue Watchers (3)
      "get_issue_watchers", "add_watcher", "remove_watcher",
      // V2: Dashboards (7)
      "list_dashboards", "search_dashboards", "get_dashboard", "create_dashboard",
      "update_dashboard", "delete_dashboard", "copy_dashboard",
      // V2: Groups (8)
      "get_group", "create_group", "delete_group", "find_groups",
      "get_group_members", "add_user_to_group", "remove_user_from_group", "bulk_get_groups",
      // V2: JQL (5)
      "parse_jql", "sanitize_jql", "get_jql_autocomplete_data",
      "get_jql_autocomplete_suggestions", "match_issues_to_jql",
      // V2: Myself (3)
      "get_myself", "update_myself", "change_my_password",
      // V2: Project Categories (5)
      "list_project_categories", "get_project_category", "create_project_category",
      "update_project_category", "delete_project_category",
      // V2: Project Features (2)
      "list_project_features", "toggle_project_feature",
      // V2: Project Properties (4)
      "list_project_properties", "get_project_property", "set_project_property", "delete_project_property",
      // V2: Project Roles Detail (8)
      "list_all_project_roles", "get_project_role_by_id", "create_project_role", "update_project_role",
      "delete_project_role", "get_project_role_actors", "add_actors_to_project_role", "remove_actor_from_project_role",
      // V2: Project Types (3)
      "list_project_types", "get_accessible_project_types", "get_project_type_by_key",
      // V2: Resolution (6)
      "list_resolutions", "get_resolution", "create_resolution",
      "update_resolution", "delete_resolution", "set_default_resolution",
      // V2: Server Info + App Roles + Status Categories (6)
      "get_server_info", "get_license", "get_application_roles", "get_application_role",
      "get_status_categories", "get_status_category",
      // V2: Tasks (2)
      "get_task", "cancel_task",
      // V2: Time Tracking (5)
      "get_time_tracking_config", "update_time_tracking_config", "list_time_tracking_providers",
      "select_time_tracking_provider", "disable_time_tracking",
      // V2: User Properties + Columns (6)
      "list_user_properties", "get_user_property", "set_user_property", "delete_user_property",
      "get_user_columns", "reset_user_columns",
      // V2: User Search (5)
      "find_users_for_picker", "find_users_assignable_to_projects", "find_users_with_permissions",
      "bulk_get_users", "find_users_by_property",
      // V2: Webhooks (5)
      "list_webhooks", "register_webhooks", "delete_webhooks", "get_failed_webhooks", "refresh_webhooks",
      // V2: Field Configurations (7)
      "list_field_configurations", "create_field_configuration", "update_field_configuration",
      "delete_field_configuration", "list_field_configuration_items", "update_field_configuration_items",
      "list_field_configuration_schemes",
      // V2: Issue Type Schemes (7)
      "list_issue_type_schemes", "create_issue_type_scheme", "update_issue_type_scheme",
      "delete_issue_type_scheme", "list_issue_type_scheme_items",
      "list_projects_for_issue_type_scheme", "assign_issue_type_scheme_to_project",
      // V2: Issue Security (5)
      "list_issue_security_schemes", "get_issue_security_scheme", "list_issue_security_levels",
      "get_issue_security_level", "list_project_security_levels",
      // V2: Workflow + Workflow Schemes (6)
      "list_workflows", "get_workflow", "create_workflow", "delete_workflow",
      "list_workflow_schemes", "get_workflow_scheme",
      // V2: Avatars (4)
      "list_system_avatars", "get_avatars", "delete_avatar", "get_avatar_image_by_id",
      // V2: Bulk Operations (5)
      "get_bulk_edit_fields", "bulk_edit_issues", "get_bulk_transition_statuses",
      "bulk_transition_issues", "bulk_delete_issues",
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
