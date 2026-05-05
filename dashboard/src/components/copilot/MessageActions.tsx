import { Check, Copy } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "../../lib/utils.ts";

export function MessageActions({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface MessageActionProps {
  onClick?: () => void;
  tooltip?: string;
  className?: string;
  children: ReactNode;
  active?: boolean;
}

export function MessageAction({
  onClick,
  tooltip,
  className,
  children,
  active,
}: MessageActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function CopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <MessageAction
      onClick={handleCopy}
      tooltip={copied ? "Copied" : "Copy"}
      active={copied}
    >
      {copied ? (
        <Check size={14} strokeWidth={2.25} />
      ) : (
        <Copy size={14} strokeWidth={2.25} />
      )}
    </MessageAction>
  );
}
