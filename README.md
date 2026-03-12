# Jira MCP Server 2026

Production-quality MCP (Model Context Protocol) server for Jira Cloud REST API v3. 16 tools covering projects, issues, sprints, boards, comments, and user management.

## Tools

| Tool | Description |
|------|-------------|
| `health_check` | Validate credentials and API connectivity |
| `list_projects` | List all accessible Jira projects |
| `get_project` | Get project details by key or ID |
| `list_issues` | List issues with filters (project, status, assignee, priority, sprint) |
| `search_issues` | Full JQL search with any query |
| `get_issue` | Get issue details with comments, links, attachments |
| `create_issue` | Create issue (summary, description, type, priority, assignee, labels) |
| `update_issue` | Update issue fields |
| `transition_issue` | Move issue to new status via workflow transition |
| `assign_issue` | Assign/unassign issue |
| `list_comments` | List issue comments |
| `add_comment` | Add comment to issue |
| `list_boards` | List Jira Software boards |
| `list_sprints` | List sprints for a board |
| `get_sprint` | Get sprint details |
| `get_user` | Get Jira user by account ID |

## Setup

### 1. Get API credentials

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Create an API token
3. Note your Jira site URL (e.g. `https://yoursite.atlassian.net`)
4. Note your Atlassian account email

### 2. Install and configure

```bash
git clone https://github.com/BusyBee3333/jira-mcp-2026-complete.git
cd jira-mcp-2026-complete
npm install
npm run build
cp .env.example .env
# Edit .env with your credentials
```

### 3. Configure Claude Desktop

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/jira-mcp-2026-complete/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://yoursite.atlassian.net",
        "JIRA_USER_EMAIL": "you@example.com",
        "JIRA_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_BASE_URL` | ✅ | Your Jira Cloud URL (e.g. `https://yoursite.atlassian.net`) |
| `JIRA_USER_EMAIL` | ✅ | Your Atlassian account email |
| `JIRA_API_TOKEN` | ✅ | API token from Atlassian account settings |
| `MCP_TRANSPORT` | ❌ | `stdio` (default) or `http` |
| `MCP_HTTP_PORT` | ❌ | HTTP port when using HTTP transport (default: 3000) |

## Features

- **Auth**: HTTP Basic using `base64(email:token)` — no OAuth flow required
- **Pagination**: Offset pagination (`startAt`, `maxResults`) on all list endpoints
- **JQL**: Full JQL query support via `search_issues`, simple filters via `list_issues`
- **ADF**: Plain text inputs auto-converted to Atlassian Document Format
- **Agile**: Boards and sprints via Jira Software Agile REST API v1
- **Circuit breaker**: Auto-opens after 5 failures, resets after 60s
- **Retry**: 3 attempts with exponential backoff + jitter for server errors
- **Timeout**: 30-second timeout per request
- **Structured output**: All tools return `content` (text) + `structuredContent` (JSON)
- **Transport**: stdio for local, HTTP/SSE for remote/production

## HTTP Transport

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 node dist/index.js
# Health check: GET http://localhost:3000/health
# MCP endpoint: POST http://localhost:3000/mcp
```

## Resources

- [Jira Cloud REST API v3 Reference](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Atlassian API Token Management](https://id.atlassian.com/manage-profile/security/api-tokens)
- [Jira Software Agile REST API](https://developer.atlassian.com/cloud/jira/software/rest/)
- [JQL Reference](https://support.atlassian.com/jira-service-management-cloud/docs/use-advanced-search-with-jira-query-language-jql/)
- [MCP Protocol Spec](https://modelcontextprotocol.io)

## License

MIT
