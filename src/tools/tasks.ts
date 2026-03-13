// Tasks tools: get_task, cancel_task
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JiraClient } from "../client.js";
import { logger } from "../logger.js";

export function registerTools(server: McpServer, client: JiraClient): void {
  // ── get_task ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_task",
    {
      title: "Get Async Task Status",
      description:
        "Get the status and progress of a long-running asynchronous task in Jira (e.g. bulk transitions, imports). Returns task status (RUNNING, COMPLETE, FAILED, CANCEL_REQUESTED, CANCELLED), progress percentage, and any messages.",
      inputSchema: {
        taskId: z.string().describe("Task ID returned when the async operation was initiated"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.get_task",
        () => client.get(`/task/${args.taskId}`),
        { tool: "get_task", taskId: args.taskId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );

  // ── cancel_task ───────────────────────────────────────────────────────────
  server.registerTool(
    "cancel_task",
    {
      title: "Cancel Async Task",
      description:
        "Request cancellation of a long-running async task. The task transitions to CANCEL_REQUESTED state. The actual cancellation may not be immediate.",
      inputSchema: {
        taskId: z.string().describe("Task ID to cancel"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const result = await logger.time(
        "tool.cancel_task",
        () => client.post(`/task/${args.taskId}/cancel`, {}),
        { tool: "cancel_task", taskId: args.taskId as string }
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
  );
}
