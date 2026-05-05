import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils.ts";

export type MessageRole = "user" | "assistant" | "system" | (string & {});

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: MessageRole;
};

export function Message({ className, from, ...props }: MessageProps) {
  const isUser = from === "user";
  return (
    <div
      data-from={from}
      className={cn(
        "group flex w-full max-w-[95%] flex-col gap-2",
        isUser ? "is-user ml-auto justify-end" : "is-assistant",
        className,
      )}
      {...props}
    />
  );
}

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export function MessageContent({
  children,
  className,
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
        "group-[.is-user]:w-fit group-[.is-user]:ml-auto",
        "group-[.is-user]:rounded-lg group-[.is-user]:bg-neutral-100 dark:group-[.is-user]:bg-secondary",
        "group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
        "group-[.is-assistant]:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
