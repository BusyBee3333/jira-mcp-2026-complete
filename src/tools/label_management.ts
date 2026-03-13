// Label Management tools: list_all_labels, search_labels, add_labels_to_issue,
// remove_labels_from_issue, replace_issue_labels, bulk_label_issues, get_label_autocomplete
// Uses Jira Cloud REST API v3
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── search_labels ─────────────────────────────────────────────────────────
  server.registerTool(
    "search_labels",
    {
      title: "Search Issue Labels",
      description:
        "Search for Jira issue labels by prefix. Returns matching label names. Useful for autocomplete when adding labels to issues.",
      inputSchema: {
        query: z.string().describe("Label prefix to search for (e.g. 'bug' returns 'bug', 'bug-fix', etc.)"),
        startAt: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        maxResults: z.number().int().min(1).max(1000).optional().describe("Results per page (default 100)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams();
      params.set("query", args.query as string);
      params.set("startAt", String(args.startAt ?? 0));
      params.set("maxResults", String(args.maxResults ?? 100));

      const result = await logger.time(
        "tool.search_labels",
        () => client.get(`/rest/api/3/label?${params}`),
        { tool: "search_labels" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── add_labels_to_issue ───────────────────────────────────────────────────
  server.registerTool(
    "add_labels_to_issue",
    {
      title: "Add Labels to Issue",
      description:
        "Add one or more labels to a Jira issue without removing existing labels. Labels are created if they don't exist. Labels must be single words with no spaces.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key (e.g. PROJ-123) or ID"),
        labels: z.array(z.string()).min(1).describe("Labels to add (no spaces allowed in label names)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      // First get current labels
      const issue = await logger.time(
        "tool.add_labels_to_issue.get",
        () =>
          client.get(
            `/rest/api/3/issue/${args.issueKeyOrId}?fields=labels`
          ),
        { tool: "add_labels_to_issue" }
      ) as { fields?: { labels?: string[] } };

      const currentLabels: string[] =
        (issue.fields?.labels as string[]) ?? [];
      const newLabels = [...new Set([...currentLabels, ...(args.labels as string[])])];

      const result = await logger.time(
        "tool.add_labels_to_issue.update",
        () =>
          client.put(`/rest/api/3/issue/${args.issueKeyOrId}`, {
            fields: { labels: newLabels },
          }),
        { tool: "add_labels_to_issue" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result
              ? JSON.stringify(result, null, 2)
              : `Labels added. Issue now has: ${newLabels.join(", ")}`,
          },
        ],
      };
    }
  );

  // ── remove_labels_from_issue ──────────────────────────────────────────────
  server.registerTool(
    "remove_labels_from_issue",
    {
      title: "Remove Labels from Issue",
      description:
        "Remove specific labels from a Jira issue while keeping other labels intact.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID"),
        labels: z.array(z.string()).min(1).describe("Labels to remove"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const issue = await logger.time(
        "tool.remove_labels_from_issue.get",
        () =>
          client.get(
            `/rest/api/3/issue/${args.issueKeyOrId}?fields=labels`
          ),
        { tool: "remove_labels_from_issue" }
      ) as { fields?: { labels?: string[] } };

      const currentLabels: string[] =
        (issue.fields?.labels as string[]) ?? [];
      const toRemove = new Set(args.labels as string[]);
      const remainingLabels = currentLabels.filter((l) => !toRemove.has(l));

      const result = await logger.time(
        "tool.remove_labels_from_issue.update",
        () =>
          client.put(`/rest/api/3/issue/${args.issueKeyOrId}`, {
            fields: { labels: remainingLabels },
          }),
        { tool: "remove_labels_from_issue" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result
              ? JSON.stringify(result, null, 2)
              : `Labels removed. Issue now has: ${remainingLabels.join(", ") || "(none)"}`,
          },
        ],
      };
    }
  );

  // ── replace_issue_labels ──────────────────────────────────────────────────
  server.registerTool(
    "replace_issue_labels",
    {
      title: "Replace All Labels on Issue",
      description:
        "Replace the complete set of labels on a Jira issue. Existing labels are removed and replaced with the provided list.",
      inputSchema: {
        issueKeyOrId: z.string().describe("Issue key or ID"),
        labels: z
          .array(z.string())
          .describe("Complete new set of labels (replaces all existing labels)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const result = await logger.time(
        "tool.replace_issue_labels",
        () =>
          client.put(`/rest/api/3/issue/${args.issueKeyOrId}`, {
            fields: { labels: args.labels },
          }),
        { tool: "replace_issue_labels" }
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result
              ? JSON.stringify(result, null, 2)
              : `Issue labels replaced with: ${(args.labels as string[]).join(", ") || "(none)"}`,
          },
        ],
      };
    }
  );

  // ── bulk_label_issues ─────────────────────────────────────────────────────
  server.registerTool(
    "bulk_label_issues",
    {
      title: "Bulk Label Issues",
      description:
        "Add labels to multiple issues at once using JQL. Fetches issues matching the JQL query and adds the specified labels to all of them. Does not remove existing labels.",
      inputSchema: {
        jql: z
          .string()
          .describe(
            "JQL query to select issues (e.g. 'project = PROJ AND sprint = \"Sprint 1\"')"
          ),
        labels: z.array(z.string()).min(1).describe("Labels to add to all matching issues"),
        maxIssues: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of issues to update (default 50, max 100)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      // Search for matching issues
      const searchResult = await logger.time(
        "tool.bulk_label_issues.search",
        () =>
          client.post("/rest/api/3/search", {
            jql: args.jql,
            maxResults: args.maxIssues ?? 50,
            fields: ["labels"],
          }),
        { tool: "bulk_label_issues" }
      ) as { issues?: Array<{ key: string; fields?: { labels?: string[] } }> };

      const issues = searchResult.issues ?? [];
      const results: Array<{ key: string; success: boolean; error?: string }> = [];

      for (const issue of issues) {
        try {
          const currentLabels: string[] = (issue.fields?.labels as string[]) ?? [];
          const newLabels = [
            ...new Set([...currentLabels, ...(args.labels as string[])]),
          ];
          await client.put(`/rest/api/3/issue/${issue.key}`, {
            fields: { labels: newLabels },
          });
          results.push({ key: issue.key, success: true });
        } catch (err) {
          results.push({
            key: issue.key,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                processed: results.length,
                successful: results.filter((r) => r.success).length,
                failed: results.filter((r) => !r.success).length,
                results,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
