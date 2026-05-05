/**
 * Visual port of AutoGPT Copilot's tool helpers
 * (autogpt_platform/frontend/src/app/(platform)/copilot/tools/GenericTool/helpers.ts).
 * Pure functions for naming, categorizing, and labelling tool calls so the
 * chat reads like a human-readable activity log rather than a JSON dump.
 */

import {
  Edit3,
  Files,
  FileText,
  Globe,
  ListChecks,
  type LucideIcon,
  Monitor,
  RefreshCw,
  Search,
  Settings,
  Terminal,
  Trash2,
} from "lucide-react";

export type ToolCategory =
  | "bash"
  | "web"
  | "browser"
  | "file-read"
  | "file-write"
  | "file-delete"
  | "file-list"
  | "search"
  | "edit"
  | "todo"
  | "compaction"
  | "agent"
  | "other";

export type ToolState = "input-available" | "output-available" | "output-error";

const TOOL_AGENT = "Agent";
const TOOL_TASK = "Task";
const TOOL_TASK_OUTPUT = "TaskOutput";

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  run_sub_session: "Sub-AutoPilot",
  get_sub_session_result: "Sub-AutoPilot result",
  run_agent: "Agent",
  view_agent_output: "Agent output",
  run_block: "Action",
  run_mcp_tool: "MCP tool",
  get_agent_building_guide: "Agent building guide",
};

export function formatToolName(name: string): string {
  const override = TOOL_DISPLAY_NAMES[name];
  if (override) return override;
  const stripped = name.startsWith("run_") ? name.slice(4) : name;
  return stripped.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function getToolCategory(toolName: string): ToolCategory {
  switch (toolName) {
    case "bash_exec":
      return "bash";
    case "web_fetch":
    case "web_search":
    case "WebSearch":
    case "WebFetch":
      return "web";
    case "browser_navigate":
    case "browser_act":
    case "browser_screenshot":
      return "browser";
    case "read_workspace_file":
    case "read_file":
    case "Read":
      return "file-read";
    case "write_workspace_file":
    case "write_file":
    case "Write":
      return "file-write";
    case "delete_workspace_file":
      return "file-delete";
    case "list_workspace_files":
    case "glob":
    case "Glob":
      return "file-list";
    case "grep":
    case "Grep":
      return "search";
    case "edit_file":
    case "Edit":
      return "edit";
    case "TodoWrite":
      return "todo";
    case "context_compaction":
      return "compaction";
    case TOOL_AGENT:
    case TOOL_TASK:
    case TOOL_TASK_OUTPUT:
      return "agent";
    default:
      return "other";
  }
}

export function categoryIcon(category: ToolCategory): LucideIcon {
  switch (category) {
    case "bash":
      return Terminal;
    case "web":
      return Globe;
    case "browser":
      return Monitor;
    case "file-read":
    case "file-write":
      return FileText;
    case "file-delete":
      return Trash2;
    case "file-list":
      return Files;
    case "search":
      return Search;
    case "edit":
      return Edit3;
    case "todo":
      return ListChecks;
    case "compaction":
      return RefreshCw;
    default:
      return Settings;
  }
}

const STRIPPABLE_EXTENSIONS =
  /\.(md|csv|json|txt|yaml|yml|xml|html|js|ts|py|sh|toml|cfg|ini|log|pdf|png|jpg|jpeg|gif|svg|mp4|mp3|wav|zip|tar|gz)$/i;

export function humanizeFileName(filePath: string): string {
  const fileName = filePath.split("/").pop() ?? filePath;
  const stem = fileName.replace(STRIPPABLE_EXTENSIONS, "");
  const words = stem
    .replace(/[_-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (w === w.toUpperCase()) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
  return `"${words.join(" ")}"`;
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trimEnd()}…`;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getInputSummary(toolName: string, input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const inp = input as Record<string, unknown>;

  switch (toolName) {
    case "bash_exec":
      return asString(inp.command);
    case "web_fetch":
    case "WebFetch":
      return asString(inp.url);
    case "web_search":
    case "WebSearch":
      return asString(inp.query);
    case "browser_navigate":
      return asString(inp.url);
    case "browser_act": {
      const action = asString(inp.action);
      if (!action) return null;
      const target = asString(inp.target);
      return target ? `${action} ${target}` : action;
    }
    case "browser_screenshot":
      return null;
    case "read_workspace_file":
    case "read_file":
    case "Read":
      return asString(inp.file_path) ?? asString(inp.path);
    case "write_workspace_file":
    case "write_file":
    case "Write":
      return asString(inp.file_path) ?? asString(inp.path);
    case "delete_workspace_file":
      return asString(inp.file_path);
    case "glob":
    case "Glob":
      return asString(inp.pattern);
    case "grep":
    case "Grep":
      return asString(inp.pattern);
    case "edit_file":
    case "Edit":
      return asString(inp.file_path);
    case "TodoWrite": {
      const todos = Array.isArray(inp.todos) ? inp.todos : [];
      const active = todos.find(
        (t: unknown) =>
          t !== null &&
          typeof t === "object" &&
          (t as Record<string, unknown>).status === "in_progress",
      ) as Record<string, unknown> | undefined;
      if (active && typeof active.activeForm === "string")
        return active.activeForm;
      if (active && typeof active.content === "string") return active.content;
      return null;
    }
    case TOOL_AGENT:
    case TOOL_TASK: {
      const description = asString(inp.description);
      if (description) return description;
      const prompt = asString(inp.prompt);
      return prompt ? truncate(prompt, 60) : null;
    }
    case TOOL_TASK_OUTPUT:
      return asString(inp.agentId);
    default:
      return null;
  }
}

export function getAnimationText(
  toolName: string,
  category: ToolCategory,
  state: ToolState,
  input: unknown,
): string {
  const summary = getInputSummary(toolName, input);
  const shortSummary = summary ? truncate(summary, 60) : null;

  if (state === "output-error") {
    switch (category) {
      case "bash":
        return "Command failed";
      case "web":
        if (toolName === "WebSearch" || toolName === "web_search")
          return "Search failed";
        return "Fetch failed";
      case "browser":
        return "Browser action failed";
      default:
        return `${formatToolName(toolName)} failed`;
    }
  }

  if (state === "output-available") {
    switch (category) {
      case "bash":
        return shortSummary ? `Ran: ${shortSummary}` : "Command completed";
      case "web":
        if (toolName === "WebSearch" || toolName === "web_search")
          return shortSummary
            ? `Searched "${shortSummary}"`
            : "Web search completed";
        return shortSummary ? `Fetched ${shortSummary}` : "Fetched web content";
      case "browser":
        if (toolName === "browser_screenshot") return "Screenshot captured";
        return shortSummary
          ? `Browsed ${shortSummary}`
          : "Browser action completed";
      case "file-read":
        return summary
          ? `Read ${humanizeFileName(summary)}`
          : "File read completed";
      case "file-write":
        return summary ? `Wrote ${humanizeFileName(summary)}` : "File written";
      case "file-delete":
        return summary
          ? `Deleted ${humanizeFileName(summary)}`
          : "File deleted";
      case "file-list":
        return "Listed files";
      case "search":
        return shortSummary
          ? `Searched for "${shortSummary}"`
          : "Search completed";
      case "edit":
        return summary
          ? `Edited ${humanizeFileName(summary)}`
          : "Edit completed";
      case "todo":
        return "Updated task list";
      case "compaction":
        return "Earlier messages were summarized";
      default:
        return `${formatToolName(toolName)} completed`;
    }
  }

  // input-available (in-flight)
  switch (category) {
    case "bash":
      return shortSummary ? `Running: ${shortSummary}` : "Running command…";
    case "web":
      if (toolName === "WebSearch" || toolName === "web_search")
        return shortSummary
          ? `Searching "${shortSummary}"`
          : "Searching the web…";
      return shortSummary
        ? `Fetching ${shortSummary}`
        : "Fetching web content…";
    case "browser":
      if (toolName === "browser_screenshot") return "Taking screenshot…";
      return shortSummary
        ? `Browsing ${shortSummary}`
        : "Interacting with browser…";
    case "file-read":
      return summary ? `Reading ${humanizeFileName(summary)}` : "Reading file…";
    case "file-write":
      return summary ? `Writing ${humanizeFileName(summary)}` : "Writing file…";
    case "file-delete":
      return summary
        ? `Deleting ${humanizeFileName(summary)}`
        : "Deleting file…";
    case "file-list":
      return shortSummary ? `Listing ${shortSummary}` : "Listing files…";
    case "search":
      return shortSummary ? `Searching for "${shortSummary}"` : "Searching…";
    case "edit":
      return summary ? `Editing ${humanizeFileName(summary)}` : "Editing file…";
    case "todo":
      return shortSummary ? shortSummary : "Updating task list…";
    case "compaction":
      return "Summarizing earlier messages…";
    default:
      return `Running ${formatToolName(toolName)}…`;
  }
}
