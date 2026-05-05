import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils.ts";

export type MessageRole = "user" | "assistant" | "system" | (string & {});

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: MessageRole;
};

/**
 * Visual port of AutoGPT Copilot's `Message` (ai-elements/message). Same
 * `is-user` / `is-assistant` group hooks so MessageContent can target them.
 */
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

/**
 * The user bubble matches Copilot's signature look: soft purple background
 * (`bg-purple-100`), rounded-xl with the bottom-right corner squared off as a
 * speech-bubble pointer, and slightly larger body text. Assistant messages
 * have no bubble — body text on transparent background, like Copilot.
 */
export function MessageContent({
  children,
  className,
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-2 overflow-hidden text-[1rem] leading-relaxed",
        // user bubble
        "group-[.is-user]:w-fit group-[.is-user]:ml-auto",
        "group-[.is-user]:rounded-xl group-[.is-user]:[border-bottom-right-radius:0]",
        "group-[.is-user]:bg-purple-100 dark:group-[.is-user]:bg-purple-500/15",
        "group-[.is-user]:px-3 group-[.is-user]:py-2.5",
        "group-[.is-user]:text-foreground",
        "group-[.is-user]:[&_h1]:text-lg group-[.is-user]:[&_h1]:font-semibold",
        "group-[.is-user]:[&_h2]:text-lg group-[.is-user]:[&_h2]:font-semibold",
        "group-[.is-user]:[&_h3]:text-lg group-[.is-user]:[&_h3]:font-semibold",
        // assistant
        "group-[.is-assistant]:bg-transparent group-[.is-assistant]:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
