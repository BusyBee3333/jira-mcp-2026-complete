/**
 * Shared TypeScript types for the Jira MCP Server.
 * These supplement the SDK types with Jira-specific shapes.
 */

/** A minimal Jira issue as returned by the REST API. */
export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: unknown; // ADF or null
    status?: { name: string; statusCategory?: { name: string } };
    assignee?: { accountId: string; displayName: string; emailAddress?: string } | null;
    reporter?: { accountId: string; displayName: string } | null;
    priority?: { name: string; id: string } | null;
    issuetype?: { name: string; id: string };
    project?: { key: string; name: string; id: string };
    created?: string;
    updated?: string;
    labels?: string[];
    components?: Array<{ id: string; name: string }>;
    fixVersions?: Array<{ id: string; name: string }>;
    comment?: { total: number; comments: JiraComment[] };
    [key: string]: unknown;
  };
}

/** A Jira comment. */
export interface JiraComment {
  id: string;
  self: string;
  author: { accountId: string; displayName: string };
  body: unknown; // ADF
  created: string;
  updated: string;
}

/** Paginated issue search response. */
export interface JiraSearchResult {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

/** A Jira project. */
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey?: string;
  lead?: { accountId: string; displayName: string };
  self: string;
}

/** A Jira Software board. */
export interface JiraBoard {
  id: number;
  name: string;
  type: "scrum" | "kanban" | string;
  location?: { projectKey: string; projectName: string };
}

/** A Jira sprint. */
export interface JiraSprint {
  id: number;
  name: string;
  state: "active" | "closed" | "future" | string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  boardId: number;
  goal?: string;
}

/** A Jira user/account. */
export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active: boolean;
  accountType: string;
  avatarUrls?: Record<string, string>;
}

/** A workflow transition. */
export interface JiraTransition {
  id: string;
  name: string;
  to: { name: string; statusCategory: { name: string } };
}

/** Standard MCP tool return type. */
export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
