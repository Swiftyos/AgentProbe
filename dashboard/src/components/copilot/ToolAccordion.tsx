import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/utils.ts";

interface Props {
  icon: ReactNode;
  title: ReactNode;
  titleClassName?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ToolAccordion({
  icon,
  title,
  titleClassName,
  description,
  children,
  className,
  defaultExpanded = false,
  expanded,
  onExpandedChange,
}: Props) {
  const contentId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded);
  const isControlled = typeof expanded === "boolean";
  const isExpanded = isControlled ? expanded : uncontrolled;

  function toggle() {
    const next = !isExpanded;
    if (!isControlled) setUncontrolled(next);
    onExpandedChange?.(next);
  }

  return (
    <div
      className={cn(
        "mt-2 w-full rounded-lg border border-border bg-muted/60 px-3 py-2",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 py-1 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex shrink-0 items-center text-foreground/80">
            {icon}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-sm font-medium text-foreground/90",
                titleClassName,
              )}
            >
              {title}
            </p>
            {description && (
              <p className="truncate text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isExpanded && "rotate-180",
          )}
          strokeWidth={2.25}
        />
      </button>

      {isExpanded && (
        <div id={contentId} className="overflow-hidden">
          <div className="pb-2 pt-3">{children}</div>
        </div>
      )}
    </div>
  );
}
