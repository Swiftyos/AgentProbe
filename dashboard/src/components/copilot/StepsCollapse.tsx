import { ChevronRight, List } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/utils.ts";

interface Props {
  children: ReactNode;
  count?: number;
  defaultExpanded?: boolean;
}

/**
 * Visual port of AutoGPT Copilot's StepsCollapse — the disclosure that wraps
 * the leading reasoning + tool calls of an assistant turn behind a "Show steps"
 * affordance, leaving the final response text as the visual focus. Inline
 * version (no Dialog) so it works without modal infrastructure.
 */
export function StepsCollapse({
  children,
  count,
  defaultExpanded = false,
}: Props) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="inline-flex w-fit items-center gap-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          size={12}
          strokeWidth={2.5}
          className={cn(
            "shrink-0 transition-transform duration-150",
            expanded && "rotate-90",
          )}
        />
        <List size={12} strokeWidth={2.5} className="shrink-0" />
        <span>
          {expanded ? "Hide steps" : "Show steps"}
          {count != null ? (
            <span className="ml-1 font-mono text-muted-foreground/70">
              · {count}
            </span>
          ) : null}
        </span>
      </button>
      {expanded && (
        <div
          id={panelId}
          className="mt-1 space-y-1 border-l border-border pl-3"
        >
          {children}
        </div>
      )}
    </div>
  );
}
