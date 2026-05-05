# TanStack Form

## Docs Lookup

```bash
curl -sL https://tanstack.com/form/latest/docs/framework/react/quick-start.md
curl -sL https://tanstack.com/form/latest/docs/framework/react/guides/validation.md
```

## When To Use

Use TanStack Form for forms with multiple fields, schema validation, async validation, reusable field components, complex pending states, or integration with Query mutations.

Use ordinary React state for tiny one-off inputs that do not need validation orchestration.

## Form Shape

- Define default values explicitly.
- Keep schema validation near the form or feature API boundary.
- Show field-level errors with accessible markup.
- Preserve input after failed submission.
- Use Query mutations for remote submit work.
- Disable or mark submit controls while pending.
- Use optimistic UI only when rollback is clear.

```tsx
import { useMutation } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  age: z.number().min(13, 'Must be 13 or older'),
})

type ProfileValue = z.infer<typeof profileSchema>

export function ProfileForm({ initialValue }: { initialValue: ProfileValue }) {
  const saveProfileMutation = useMutation({
    mutationFn: saveProfile,
  })

  const form = useForm({
    defaultValues: initialValue,
    validators: {
      onChange: profileSchema,
    },
    onSubmit: async ({ value }) => {
      await saveProfileMutation.mutateAsync(value)
    },
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field name="displayName">
        {(field) => (
          <label>
            Display name
            <input
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {!field.state.meta.isValid ? (
              <span role="alert">{field.state.meta.errors.join(', ')}</span>
            ) : null}
          </label>
        )}
      </form.Field>

      <form.Field name="age">
        {(field) => (
          <label>
            Age
            <input
              name={field.name}
              type="number"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) =>
                field.handleChange(event.currentTarget.valueAsNumber)
              }
            />
            {!field.state.meta.isValid ? (
              <span role="alert">{field.state.meta.errors.join(', ')}</span>
            ) : null}
          </label>
        )}
      </form.Field>

      <button type="submit" disabled={saveProfileMutation.isPending}>
        Save
      </button>
    </form>
  )
}
```

## Validation

- Use form-level schemas when the full value should be validated together.
- Use field-level validators for local field rules and custom messages.
- Use async validators for remote checks.
- Debounce async validation to avoid a request per keystroke.

```tsx
<form.Field
  name="username"
  asyncDebounceMs={500}
  validators={{
    onChangeAsync: async ({ value }) => {
      const available = await isUsernameAvailable(value)
      return available ? undefined : 'Username is already taken'
    },
  }}
>
  {(field) => (
    <label>
      Username
      <input
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
    </label>
  )}
</form.Field>
```

Prefer schema libraries that support standard schema behavior when the project already uses one.

## Reusable Form Components

For product apps with many forms, use `createFormHook` and app-specific field components to reduce boilerplate while keeping field names typed. Keep the generated form hook in a shared UI or form module, not inside individual pages.

Use one-off `useForm` and `form.Field` for smaller forms or while introducing TanStack Form incrementally.

## Integration With Query

- Put the remote write in a `useMutation`.
- Use `mutateAsync` from `onSubmit` when the form should await completion.
- Invalidate or update Query caches in the mutation, not inside field components.
- Translate known API validation failures into field or form errors when the app has an error mapping convention.
