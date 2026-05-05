import { ChevronDown, Lightbulb } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/utils.ts";

interface Props {
  children: ReactNode;
  defaultExpanded?: boolean;
  label?: string;
}

export function ReasoningCollapse({
  children,
  defaultExpanded = false,
  label = "Reasoning",
}: Props) {
  const contentId = useId();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="my-1">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded((v) => !v)}
        className="flex items-center gap-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <Lightbulb size={14} strokeWidth={2.25} className="shrink-0" />
        <span>{label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.25}
          className={cn(
            "shrink-0 transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </button>
      {isExpanded && (
        <div
          id={contentId}
          className="pb-1 pl-5 pt-0 text-xs text-muted-foreground"
        >
          {children}
        </div>
      )}
    </div>
  );
}
