export const AGENT_STATUSES = {
  IDLE: "IDLE",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type AgentStatus = (typeof AGENT_STATUSES)[keyof typeof AGENT_STATUSES];

export const TOOL_CALL_STATUSES = {
  PENDING: "PENDING",
  EXECUTING: "EXECUTING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
} as const;

export type ToolCallStatus = (typeof TOOL_CALL_STATUSES)[keyof typeof TOOL_CALL_STATUSES];

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  output: unknown;
  isError?: boolean;
  error?: string;
  durationMs?: number;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: ToolCallStatus;
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type PlanStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface PlanStep {
  id: string;
  title: string;
  status: PlanStepStatus;
  tool?: string;
  error?: string;
}

export interface AgentPlan {
  steps: PlanStep[];
}

export interface AgentTraceStep {
  step: number;
  type: "tool_call" | "tool_result" | "thought" | "final_response" | "error";
  tool?: string;
  toolCallId?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  status?: "running" | "completed" | "failed";
  durationMs?: number;
  timestamp: string;
}

export interface AgentExecutionResult {
  executionId: string;
  userId: string;
  task: string;
  status: AgentStatus;
  output: string | null;
  stepsCompleted: number;
  toolCalls: ToolCallInfo[];
  trace?: AgentTraceStep[];
  sources?: any[];
  plan?: AgentPlan;
  usage: AgentUsage;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  conversationId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface RunAgentDTO {
  task: string;
  conversationId?: string;
  systemPrompt?: string;
  maxSteps?: number;
  context?: Record<string, unknown>;
  stream?: boolean;
}

export type ExecuteAgentDTO = RunAgentDTO;
export type RunAgentRequest = RunAgentDTO;
export type ExecuteAgentRequest = RunAgentDTO;

export type AgentExecutionStatusType =
  | "started"
  | "tool_running"
  | "tool_completed"
  | "tool_failed"
  | "generating"
  | "completed";

export interface ToolStatusEvent {
  status: "running" | "completed" | "failed";
  tool: string;
  toolCallId?: string;
  error?: string;
  durationMs?: number;
}

export interface AgentStreamCallbacks {
  onStart?: (data: { userMessage?: any; conversationId?: string }) => void;
  onStatus?: (status: string, message: string) => void;
  onPlan?: (plan: AgentPlan) => void;
  onToolStatus?: (event: ToolStatusEvent) => void;
  onTrace?: (trace: AgentTraceStep) => void;
  onSources?: (sources: any[]) => void;
  onChunk?: (chunk: string) => void;
  onDone?: (result: AgentExecutionResult) => void;
  onError?: (error: Error) => void;
}
