// JQL tools: parse_jql, validate_jql, get_jql_autocomplete_data, get_field_reference_data, get_jql_autocomplete_suggestions
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── parse_jql ─────────────────────────────────────────────────────────────
  server.registerTool(
    "parse_jql",
    {
      title: "Parse JQL Query",
      description:
        "Parse and validate a JQL query string. Returns the parsed query structure, any errors, and warnings. Use to check JQL syntax before running searches.",
      inputSchema: {
        queries: z.array(z.string()).describe("Array of JQL query strings to parse and validate"),
        validation: z
          .enum(["strict", "warn", "none"])
          .optional()
          .describe("Validation mode: strict (errors on any issue), warn (warnings only), none (skip validation)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const payload: Record<string, unknown> = { queries: args.queries };
      if (args.validation) payload.validation = args.validation;
      const result = await logger.time(
        "tool.parse_jql",
        () => client.post("/jql/parse", payload),
        { tool: "parse_jql" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── sanitize_jql ──────────────────────────────────────────────────────────
  server.registerTool(
    "sanitize_jql",
    {
      title: "Sanitize JQL Queries",
      description:
        "Sanitizes one or more JQL queries by converting readable values (e.g. project names) to IDs where needed for the given account IDs.",
      inputSchema: {
        queries: z
          .array(
            z.object({
              query: z.string().describe("JQL query string"),
              accountId: z.string().optional().describe("Account ID to sanitize JQL for"),
            })
          )
          .describe("List of JQL queries with optional account IDs"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.sanitize_jql",
        () => client.post("/jql/sanitize", { queries: args.queries }),
        { tool: "sanitize_jql" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_jql_autocomplete_data ─────────────────────────────────────────────
  server.registerTool(
    "get_jql_autocomplete_data",
    {
      title: "Get JQL Autocomplete Data",
      description:
        "Get reference data for JQL autocomplete. Returns a list of all JQL fields and operators that can be used in queries, useful for building JQL editors or validators.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (_args) => {
      const result = await logger.time(
        "tool.get_jql_autocomplete_data",
        () => client.get("/jql/autocompletedata"),
        { tool: "get_jql_autocomplete_data" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── get_jql_autocomplete_suggestions ─────────────────────────────────────
  server.registerTool(
    "get_jql_autocomplete_suggestions",
    {
      title: "Get JQL Autocomplete Suggestions",
      description:
        "Get autocomplete suggestions for a specific JQL field and partial value. Useful for building interactive JQL editors.",
      inputSchema: {
        fieldName: z.string().describe("JQL field name to get suggestions for (e.g. 'project', 'assignee', 'status')"),
        fieldValue: z.string().optional().describe("Partial field value to get completions for"),
        predicateName: z.string().optional().describe("Predicate name (for JQL predicates)"),
        predicateValue: z.string().optional().describe("Partial predicate value"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const params = new URLSearchParams({ fieldName: args.fieldName as string });
      if (args.fieldValue) params.set("fieldValue", args.fieldValue as string);
      if (args.predicateName) params.set("predicateName", args.predicateName as string);
      if (args.predicateValue) params.set("predicateValue", args.predicateValue as string);
      const result = await logger.time(
        "tool.get_jql_autocomplete_suggestions",
        () => client.get(`/jql/autocompletedata/suggestions?${params}`),
        { tool: "get_jql_autocomplete_suggestions" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── match_issues_to_jql ───────────────────────────────────────────────────
  server.registerTool(
    "match_issues_to_jql",
    {
      title: "Match Issues to JQL Queries",
      description:
        "Check which of the given issue keys match each of the provided JQL queries. Useful for testing multiple JQL rules against a set of issues.",
      inputSchema: {
        issueIds: z.array(z.number()).describe("List of issue IDs to test"),
        jqls: z.array(z.string()).describe("List of JQL queries to match against"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.match_issues_to_jql",
        () => client.post("/jql/match", { issueIds: args.issueIds, jqls: args.jqls }),
        { tool: "match_issues_to_jql" }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
