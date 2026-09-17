import apiClient, { getAuthToken, API_BASE_URL } from "@/lib/api/client";
import type {
  ApiResponse,
  AgentExecutionResult,
  RunAgentDTO,
  AgentStreamCallbacks,
} from "@/types";

export const agentKeys = {
  all: ["agent"] as const,
  executions: () => [...agentKeys.all, "executions"] as const,
};

/**
 * Executes an autonomous agent task by calling the agent run endpoint synchronously.
 * Connects to: POST /api/v1/agent/run
 */
export const runAgent = async (
  data: RunAgentDTO,
): Promise<AgentExecutionResult> => {
  const response = await apiClient.post<ApiResponse<AgentExecutionResult>>(
    "/agent/run",
    data,
  );
  return response.data.data;
};

/**
 * Execute agent alias for backwards compatibility and ergonomic naming.
 */
export const executeAgent = runAgent;

/**
 * Executes an autonomous agent task with real-time progressive streaming,
 * safe tool status visibility, and request cancellation support.
 * Connects to: POST /api/v1/agent/run with Accept: text/event-stream
 */
export const streamAgentExecution = async (
  data: RunAgentDTO,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}/agent/run`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      ...data,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMessage =
        errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      // Fallback
    }
    const error = new Error(errorMessage);
    callbacks.onError?.(error);
    throw error;
  }

  if (!response.body) {
    const error = new Error("No response body returned from agent streaming server");
    callbacks.onError?.(error);
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        for (const line of trimmed.split("\n")) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            try {
              const payload = JSON.parse(jsonStr);
              if (payload.type === "start") {
                callbacks.onStart?.(payload);
              } else if (payload.type === "status") {
                callbacks.onStatus?.(payload.status, payload.message);
              } else if (payload.type === "tool_status") {
                callbacks.onToolStatus?.(payload);
              } else if (payload.type === "chunk") {
                if (payload.content) {
                  callbacks.onChunk?.(payload.content);
                }
              } else if (payload.type === "done") {
                callbacks.onDone?.(payload.data || payload);
              } else if (payload.type === "aborted") {
                return;
              } else if (payload.type === "error") {
                const err = new Error(
                  payload.error?.message || "Agent execution failed",
                );
                callbacks.onError?.(err);
                throw err;
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                parseErr.name === "Error" &&
                parseErr.message !== "Unexpected end of JSON input"
              ) {
                // Ignore chunk parsing glitches
              }
            }
          }
        }
      }
    }
  } catch (streamErr: unknown) {
    if (signal?.aborted) {
      return;
    }
    if (streamErr instanceof Error) {
      callbacks.onError?.(streamErr);
    }
    throw streamErr;
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }
};
