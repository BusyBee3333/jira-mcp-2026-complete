// Issues tools: list_issues, search_issues, get_issue, create_issue, update_issue, transition_issue, assign_issue
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── list_issues ────────────────────────────────────────────────────────────
  server.registerTool(
    "list_issues",
    {
      title: "List Jira Issues",
      description:
        "List Jira issues using built-in filters. Builds JQL from project, status, assignee, priority, sprint, issueType, and labels. Returns issue key, summary, status, assignee, priority. For complex JQL queries, use search_issues instead.",
      inputSchema: {
        project: z.string().optional().describe("Project key (e.g. PROJ)"),
        status: z.string().optional().describe("Issue status (e.g. 'In Progress', 'Done', 'To Do')"),
        assignee: z.string().optional().describe("Assignee account ID or 'currentUser()'"),
        priority: z.string().optional().describe("Priority name (e.g. High, Medium, Low)"),
        sprint: z.string().optional().describe("Sprint name or ID"),
        issueType: z.string().optional().describe("Issue type (e.g. Bug, Story, Task)"),
        labels: z.string().optional().describe("Comma-separated label names"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
        orderBy: z.string().optional().describe("JQL ORDER BY field (e.g. 'created DESC')"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const jqlParts: string[] = [];
      if (args.project) jqlParts.push(`project = "${args.project}"`);
      if (args.status) jqlParts.push(`status = "${args.status}"`);
      if (args.assignee) {
        const a = args.assignee as string;
        jqlParts.push(`assignee = ${a.includes("(") ? a : `"${a}"`}`);
      }
      if (args.priority) jqlParts.push(`priority = "${args.priority}"`);
      if (args.sprint) jqlParts.push(`sprint = "${args.sprint}"`);
      if (args.issueType) jqlParts.push(`issuetype = "${args.issueType}"`);
      if (args.labels) {
        const labelList = (args.labels as string).split(",").map((l) => l.trim());
        jqlParts.push(`labels in (${labelList.map((l) => `"${l}"`).join(",")})`);
      }

      const orderBy = args.orderBy ? String(args.orderBy) : "created DESC";
      const jql = jqlParts.length
        ? `${jqlParts.join(" AND ")} ORDER BY ${orderBy}`
        : `ORDER BY ${orderBy}`;

      const body = {
        jql,
        startAt: args.startAt ?? 0,
        maxResults: args.maxResults ?? 50,
        fields: ["summary", "status", "assignee", "priority", "reporter", "issuetype", "created", "updated", "labels", "description"],
      };

      const result = await logger.time(
        "tool.list_issues",
        () => client.post("/search", body),
        { tool: "list_issues" }
      ) as Record<string, unknown>;

      const response = { ...(result as object), jql };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
        structuredContent: response,
      };
    }
  );

  // ── search_issues ──────────────────────────────────────────────────────────
  server.registerTool(
    "search_issues",
    {
      title: "Search Jira Issues (JQL)",
      description:
        "Search Jira issues with a full JQL query string. Supports all JQL operators, functions, and clauses. Examples: 'project = PROJ AND sprint in openSprints() AND priority in (High, Highest)'. For simple filters, use list_issues instead.",
      inputSchema: {
        jql: z.string().describe("Full JQL query string (e.g. 'project = PROJ AND status = \"In Progress\"')"),
        fields: z.array(z.string()).optional().describe("Fields to return (default: key fields)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(100).optional().describe("Results per page (default 50)"),
        expand: z.string().optional().describe("Expand fields (e.g. changelog,transitions)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const body: Record<string, unknown> = {
        jql: args.jql,
        startAt: args.startAt ?? 0,
        maxResults: args.maxResults ?? 50,
        fields: args.fields ?? ["summary", "status", "assignee", "priority", "reporter", "issuetype", "created", "updated"],
      };
      if (args.expand) body.expand = args.expand;

      const result = await logger.time(
        "tool.search_issues",
        () => client.post("/search", body),
        { tool: "search_issues" }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_issue ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_issue",
    {
      title: "Get Jira Issue",
      description:
        "Get full details for a Jira issue by key (e.g. PROJ-123). Returns summary, description, status, assignee, priority, reporter, comments, links, attachments, subtasks, and custom fields. Use when the user references a specific issue key.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        expand: z.string().optional().describe("Expand fields (e.g. changelog,transitions,renderedFields)"),
        fields: z.string().optional().describe("Comma-separated fields to return (default: all)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      if (args.expand) params.set("expand", args.expand as string);
      if (args.fields) params.set("fields", args.fields as string);
      const qs = params.toString() ? `?${params}` : "";

      const result = await logger.time(
        "tool.get_issue",
        () => client.get(`/issue/${args.issueKeyOrId}${qs}`),
        { tool: "get_issue", issue: args.issueKeyOrId as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── create_issue ───────────────────────────────────────────────────────────
  server.registerTool(
    "create_issue",
    {
      title: "Create Jira Issue",
      description:
        "Create a new Jira issue. Required: project key and summary. Optional: description, issue type (Bug/Story/Task/Epic — default Task), priority, assignee (account ID), labels, parent key (for subtasks), components, fix versions. Returns the new issue key and ID.",
      inputSchema: {
        project: z.string().describe("Project key (e.g. PROJ)"),
        summary: z.string().describe("Issue summary/title"),
        issueType: z.string().optional().describe("Issue type: Bug, Story, Task, Epic (default: Task)"),
        description: z.string().optional().describe("Issue description (plain text)"),
        priority: z.string().optional().describe("Priority: Highest, High, Medium, Low, Lowest"),
        assignee: z.string().optional().describe("Assignee account ID"),
        labels: z.array(z.string()).optional().describe("Array of label strings"),
        parentKey: z.string().optional().describe("Parent issue key (for subtasks, e.g. PROJ-10)"),
        components: z.array(z.string()).optional().describe("Array of component names"),
        fixVersions: z.array(z.string()).optional().describe("Array of fix version names"),
        customFields: z.record(z.unknown()).optional().describe("Custom field values keyed by field ID"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const fields: Record<string, unknown> = {
        project: { key: args.project },
        summary: args.summary,
        issuetype: { name: args.issueType || "Task" },
      };

      if (args.description) {
        fields.description = {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: args.description }] }],
        };
      }
      if (args.priority) fields.priority = { name: args.priority };
      if (args.assignee) fields.assignee = { accountId: args.assignee };
      if (args.labels) fields.labels = args.labels;
      if (args.parentKey) fields.parent = { key: args.parentKey };
      if (args.components) fields.components = (args.components as string[]).map((name) => ({ name }));
      if (args.fixVersions) fields.fixVersions = (args.fixVersions as string[]).map((name) => ({ name }));
      if (args.customFields) Object.assign(fields, args.customFields);

      const result = await logger.time(
        "tool.create_issue",
        () => client.post("/issue", { fields }),
        { tool: "create_issue", project: args.project as string }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── update_issue ───────────────────────────────────────────────────────────
  server.registerTool(
    "update_issue",
    {
      title: "Update Jira Issue",
      description:
        "Update fields of an existing Jira issue. Only include fields to change. To change issue status, use transition_issue instead. Returns success confirmation.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or issue ID"),
        summary: z.string().optional().describe("New summary"),
        description: z.string().optional().describe("New description (plain text)"),
        priority: z.string().optional().describe("New priority name"),
        assignee: z.string().nullable().optional().describe("New assignee account ID (null to unassign)"),
        labels: z.array(z.string()).optional().describe("New labels (replaces existing)"),
        components: z.array(z.string()).optional().describe("New components array"),
        fixVersions: z.array(z.string()).optional().describe("New fix versions array"),
        customFields: z.record(z.unknown()).optional().describe("Custom field values keyed by field ID"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const fields: Record<string, unknown> = {};
      if (args.summary) fields.summary = args.summary;
      if (args.description !== undefined) {
        fields.description = {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: args.description }] }],
        };
      }
      if (args.priority) fields.priority = { name: args.priority };
      if (args.assignee !== undefined) {
        fields.assignee = args.assignee ? { accountId: args.assignee } : null;
      }
      if (args.labels) fields.labels = args.labels;
      if (args.components) fields.components = (args.components as string[]).map((name) => ({ name }));
      if (args.fixVersions) fields.fixVersions = (args.fixVersions as string[]).map((name) => ({ name }));
      if (args.customFields) Object.assign(fields, args.customFields);

      await logger.time(
        "tool.update_issue",
        () => client.put(`/issue/${args.issueKeyOrId}`, { fields }),
        { tool: "update_issue", issue: args.issueKeyOrId as string }
      );

      const result = { success: true, issueKey: args.issueKeyOrId };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );

  // ── transition_issue ───────────────────────────────────────────────────────
  server.registerTool(
    "transition_issue",
    {
      title: "Transition Jira Issue",
      description:
        "Move a Jira issue to a new status via workflow transition. Provide either transitionId (get from get_issue with expand=transitions) or transitionName (e.g. 'In Progress', 'Done'). Optionally add a comment with the transition.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or ID"),
        transitionId: z.string().optional().describe("Transition ID (from get_issue expand=transitions)"),
        transitionName: z.string().optional().describe("Transition name (e.g. 'In Progress', 'Done') — used if transitionId not provided"),
        comment: z.string().optional().describe("Optional comment to add with the transition"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      let transitionId = args.transitionId as string | undefined;

      if (!transitionId && args.transitionName) {
        const transitionsResult = await client.get<{ transitions: Array<{ id: string; name: string }> }>(
          `/issue/${args.issueKeyOrId}/transitions`
        );
        const found = transitionsResult.transitions?.find(
          (t) => t.name.toLowerCase() === (args.transitionName as string).toLowerCase()
        );
        if (!found) {
          const available = transitionsResult.transitions?.map((t) => t.name).join(", ");
          throw new Error(`Transition "${args.transitionName}" not found. Available: ${available}`);
        }
        transitionId = found.id;
      }

      if (!transitionId) throw new Error("Either transitionId or transitionName must be provided");

      const body: Record<string, unknown> = { transition: { id: transitionId } };
      if (args.comment) {
        body.update = {
          comment: [{
            add: {
              body: {
                type: "doc",
                version: 1,
                content: [{ type: "paragraph", content: [{ type: "text", text: args.comment }] }],
              },
            },
          }],
        };
      }

      await logger.time(
        "tool.transition_issue",
        () => client.post(`/issue/${args.issueKeyOrId}/transitions`, body),
        { tool: "transition_issue", issue: args.issueKeyOrId as string }
      );

      const result = { success: true, issueKey: args.issueKeyOrId, transitionId };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── assign_issue ───────────────────────────────────────────────────────────
  server.registerTool(
    "assign_issue",
    {
      title: "Assign Jira Issue",
      description:
        "Assign a Jira issue to a user by account ID, or unassign it. Use get_user to find account IDs. Pass null as accountId to unassign.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or ID"),
        accountId: z.string().nullable().describe("Assignee account ID, or null to unassign"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      await logger.time(
        "tool.assign_issue",
        () => client.put(`/issue/${args.issueKeyOrId}/assignee`, { accountId: args.accountId }),
        { tool: "assign_issue", issue: args.issueKeyOrId as string }
      );

      const result = { success: true, issueKey: args.issueKeyOrId };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
