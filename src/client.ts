// Jira Cloud REST API v3 Client
// Auth: Basic (base64 email:token)
// Handles: auth headers, timeouts, circuit breaker, retry, rate limiting

import { logger } from "./logger.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000;

// ============================================
// CIRCUIT BREAKER
// ============================================
type CircuitState = "closed" | "open" | "half-open";

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenLock = false;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(failureThreshold = 5, resetTimeoutMs = 60_000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  canExecute(): boolean {
    if (this.state === "closed") return true;
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        if (!this.halfOpenLock) {
          this.halfOpenLock = true;
          this.state = "half-open";
          logger.info("circuit_breaker.half_open");
          return true;
        }
        return false;
      }
      return false;
    }
    return false;
  }

  recordSuccess(): void {
    this.halfOpenLock = false;
    if (this.state !== "closed") {
      logger.info("circuit_breaker.closed", { previousFailures: this.failureCount });
    }
    this.failureCount = 0;
    this.state = "closed";
  }

  recordFailure(): void {
    this.halfOpenLock = false;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold || this.state === "half-open") {
      this.state = "open";
      logger.warn("circuit_breaker.open", { failureCount: this.failureCount });
    }
  }

  getState(): CircuitState { return this.state; }
}

// ============================================
// JIRA API CLIENT
// ============================================
export class JiraClient {
  private baseUrl: string;
  private authHeader: string;
  private timeoutMs: number;
  private circuitBreaker: CircuitBreaker;

  constructor(baseUrl: string, email: string, apiToken: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.authHeader = "Basic " + Buffer.from(`${email}:${apiToken}`).toString("base64");
    this.timeoutMs = timeoutMs;
    this.circuitBreaker = new CircuitBreaker();
  }

  async request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.circuitBreaker.canExecute()) {
      throw new Error("Circuit breaker is open — Jira API is temporarily unavailable. Try again in 60 seconds.");
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      const requestId = logger.requestId();
      const start = performance.now();

      try {
        // Route to correct API base:
        // - /agile/  → /rest/agile/1.0
        // - /servicedeskapi/ → /rest/servicedeskapi
        // - everything else  → /rest/api/3
        const url = path.startsWith("/agile/")
          ? `${this.baseUrl}/rest${path}`
          : path.startsWith("/servicedeskapi/")
            ? `${this.baseUrl}/rest${path}`
            : `${this.baseUrl}/rest/api/3${path}`;
        logger.debug("api_request.start", {
          requestId,
          method: options.method || "GET",
          path,
          attempt: attempt + 1,
        });

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            "Authorization": this.authHeader,
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...options.headers,
          },
        });

        const durationMs = Math.round(performance.now() - start);

        // Rate limit
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
          logger.warn("api_request.rate_limited", { requestId, retryAfter, path });
          await this.delay(retryAfter * 1000);
          continue;
        }

        // Server errors — retry
        if (response.status >= 500) {
          this.circuitBreaker.recordFailure();
          lastError = new Error(`Jira server error: ${response.status} ${response.statusText}`);
          logger.warn("api_request.server_error", { requestId, durationMs, status: response.status, path });
          const backoff = RETRY_BASE_DELAY * Math.pow(2, attempt);
          await this.delay(backoff + Math.random() * backoff * 0.5);
          continue;
        }

        // Client errors — don't retry
        if (!response.ok) {
          let errorBody = "";
          try { errorBody = await response.text(); } catch {}
          let errorMessage = `Jira API error ${response.status}: ${response.statusText}`;
          try {
            const parsed = JSON.parse(errorBody);
            if (parsed.errorMessages?.length) errorMessage += ` — ${parsed.errorMessages.join(", ")}`;
            if (parsed.errors) errorMessage += ` — ${JSON.stringify(parsed.errors)}`;
          } catch {}
          logger.error("api_request.client_error", { requestId, durationMs, status: response.status, path, body: errorBody.slice(0, 500) });
          throw new Error(errorMessage);
        }

        this.circuitBreaker.recordSuccess();
        logger.debug("api_request.done", { requestId, durationMs, status: response.status, path });

        if (response.status === 204) return { success: true } as T;
        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          this.circuitBreaker.recordFailure();
          lastError = new Error(`Request timeout after ${this.timeoutMs}ms: ${path}`);
          logger.error("api_request.timeout", { requestId: "", path, timeoutMs: this.timeoutMs });
          continue;
        }
        if (error instanceof Error && !error.message.startsWith("Jira server error")) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T = unknown>(path: string, data: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(data) });
  }

  async put<T = unknown>(path: string, data: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body: JSON.stringify(data) });
  }

  async patch<T = unknown>(path: string, data: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(data) });
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  async healthCheck(): Promise<{ reachable: boolean; authenticated: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch(`${this.baseUrl}/rest/api/3/myself`, {
          signal: controller.signal,
          headers: {
            "Authorization": this.authHeader,
            "Accept": "application/json",
          },
        });
        const latencyMs = Math.round(performance.now() - start);
        return {
          reachable: true,
          authenticated: response.status !== 401 && response.status !== 403,
          latencyMs,
          ...(response.status >= 400 ? { error: `HTTP ${response.status}` } : {}),
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      return {
        reachable: false,
        authenticated: false,
        latencyMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
