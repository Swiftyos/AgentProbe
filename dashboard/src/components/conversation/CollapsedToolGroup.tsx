import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import type { MessagePart } from "../../types.ts";
import {
  categoryIcon,
  getAnimationText,
  getToolCategory,
  type ToolCategory,
} from "./toolHelpers.ts";

interface Props {
  parts: Array<MessagePart & { kind: "tool" }>;
}

function isToolError(part: MessagePart & { kind: "tool" }): boolean {
  if (typeof part.output === "object" && part.output !== null) {
    const out = part.output as Record<string, unknown>;
    if (out.error || out.is_error === true || out.status === "error")
      return true;
  }
  return false;
}

function EntryIcon({
  category,
  isError,
}: {
  category: ToolCategory;
  isError: boolean;
}) {
  if (isError) {
    return (
      <AlertTriangle size={14} strokeWidth={2} className="text-rose-500" />
    );
  }
  const Icon = categoryIcon(category);
  return <Icon size={14} strokeWidth={2} className="text-emerald-500" />;
}

/**
 * Visual port of AutoGPT Copilot's CollapsedToolGroup — collapses 2+
 * consecutive completed tool calls into a single "✓ N tool calls completed"
 * line that expands into a category-iconed checklist of one-liners.
 */
export function CollapsedToolGroup({ parts }: Props) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  const errorCount = parts.filter(isToolError).length;
  const label =
    errorCount > 0
      ? `${parts.length} tool calls (${errorCount} failed)`
      : `${parts.length} tool calls completed`;

  return (
    <div className="py-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          size={12}
          strokeWidth={2.5}
          className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
        />
        {errorCount > 0 ? (
          <AlertTriangle size={14} strokeWidth={2} className="text-rose-500" />
        ) : (
          <CheckCircle2
            size={14}
            strokeWidth={2}
            className="text-emerald-500"
          />
        )}
        <span>{label}</span>
      </button>

      {expanded && (
        <div
          id={panelId}
          className="ml-5 mt-1 space-y-0.5 border-l border-border pl-3"
        >
          {parts.map((part, i) => {
            const category = getToolCategory(part.name);
            const state =
              part.output === undefined
                ? "input-available"
                : "output-available";
            const text = getAnimationText(
              part.name,
              category,
              state,
              part.input,
            );
            const isError = isToolError(part);
            return (
              <div
                key={part.toolCallId ?? `${part.name}-${i}`}
                className={
                  "flex items-center gap-1.5 text-xs " +
                  (isError ? "text-rose-500" : "text-muted-foreground")
                }
              >
                <EntryIcon category={category} isError={isError} />
                <span className="truncate">{text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
