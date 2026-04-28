import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils.ts";

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <hr
      aria-orientation={orientation}
      className={cn(
        "border-0 shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full my-0" : "h-full w-px",
        className,
      )}
      {...(props as HTMLAttributes<HTMLHRElement>)}
    />
  );
}
