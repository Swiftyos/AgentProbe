# TanStack AI For React Client Apps

## Docs Lookup

Use `curl` for direct page retrieval. Use `tanstack search-docs` only when search or JSON output is useful and the CLI is already available.

```bash
curl -sL https://tanstack.com/ai/latest/docs/getting-started/overview.md
curl -sL https://tanstack.com/ai/latest/docs/api/ai-react.md
curl -sL https://tanstack.com/ai/latest/docs/tools/tools.md
```

## Boundary

Use TanStack AI for React chat state, streamed UI, typed messages, client-side tool execution, and approval UI. Use `https://github.com/badlogic/pi-mono` on the backend as the AI provider layer.

Do not put provider adapters, model routing, provider keys, or privileged tools in browser code. The browser should connect to typed backend endpoints or capabilities that are implemented with pi-mono. The pi-mono README describes `@mariozechner/pi-ai` as a unified multi-provider LLM API and `@mariozechner/pi-agent-core` as an agent runtime with tool calling and state management; treat those as backend concerns.

## Package Selection

- Use `@tanstack/ai-react` for `useChat` and React chat state.
- Use `@tanstack/ai-client` helpers such as `fetchServerSentEvents`, `fetchHttpStream`, `createChatClientOptions`, `clientTools`, and `InferChatMessages` when needed.
- Use `@tanstack/ai` shared tool definitions only when the project already shares tool schemas between backend and client. Keep implementations environment-specific.
- Do not install provider adapter packages in the React app unless the user explicitly asks for browser-side provider experimentation.

## React Chat Pattern

Keep chat UI as ordinary client React: controlled input, streamed message rendering, stop/retry affordances, error state, and accessible submit behavior. Use shadcn/ui components when building the actual UI; use the shadcn skill for component-specific details.

```tsx
import type { FormEvent } from 'react'
import { useState } from 'react'
import { fetchServerSentEvents, useChat } from '@tanstack/ai-react'

export function AssistantChat() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, stop, isLoading, error } = useChat({
    connection: fetchServerSentEvents('/api/ai/chat'),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = input.trim()
    if (!prompt || isLoading) return

    setInput('')
    await sendMessage(prompt)
  }

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((message) => (
        <article key={message.id}>
          <h3>{message.role === 'assistant' ? 'Assistant' : 'You'}</h3>
          {message.parts.map((part, index) => {
            if (part.type === 'text') {
              return <p key={index}>{part.content}</p>
            }

            if (part.type === 'thinking') {
              return <p key={index}>Thinking...</p>
            }

            return null
          })}
        </article>
      ))}

      {error ? <p role="alert">{error.message}</p> : null}

      <textarea
        value={input}
        onChange={(event) => setInput(event.currentTarget.value)}
        disabled={isLoading}
      />
      <button type="submit" disabled={!input.trim() || isLoading}>
        Send
      </button>
      {isLoading ? (
        <button type="button" onClick={stop}>
          Stop
        </button>
      ) : null}
    </form>
  )
}
```

Replace raw elements with the app's shadcn/ui primitives during implementation.

## Client Tools And Approvals

Use client tools only for browser-local effects: updating UI state, writing safe local preferences, focusing UI, opening command surfaces, or staging edits for user review.

Use backend tools for data access, privileged actions, provider calls, pi agent actions, billing, auth-sensitive work, and anything needing secrets.

For approvals:

- Render tool approval requests as explicit UI, not hidden side effects.
- Show the tool name, requested action, arguments in human language, and consequences.
- Require approval for destructive, costly, external, or cross-workspace actions.
- Use `addToolApprovalResponse` from `useChat` when the backend requests approval.

## Query And Router Integration

- Use TanStack Query for chat history, conversation lists, saved artifacts, run status, and replay metadata.
- Use TanStack Router search params for selected conversation, tab, filters, model/debug view, or inspector panels that should be shareable.
- Invalidate or update Query caches after sending messages, renaming conversations, deleting threads, or receiving completed artifacts.
- Keep live streaming state in `useChat`; persist completed durable state through backend APIs and Query.

## UI Guidance

- Use shadcn/ui primitives and the existing design system for buttons, textareas, scroll areas, dialogs, tabs, command menus, tooltips, alerts, and cards.
- Do not put feature explanation text in the app UI unless product requirements call for it.
- Separate message rendering, composer, approval cards, tool result cards, and artifact panels into focused components.
- Make loading, streaming, stopped, error, empty, and retry states visible.
- Ensure keyboard submission, focus management, screen reader labels, and reduced-motion behavior are handled.

## Review Checklist

- Are provider keys and model/provider selection kept out of browser code?
- Does browser code call the pi-mono-backed API/capability instead of provider adapters?
- Are streamed messages, errors, stops, retries, and empty states represented?
- Are client tools limited to safe browser-local behavior?
- Are approval requests explicit and understandable?
- Is durable chat state handled through Query and backend APIs rather than duplicated global state?
- Does UI use shadcn conventions where the project expects them?
