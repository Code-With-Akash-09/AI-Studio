---
name: forms-standard
description: "Mandatory form stack: react-hook-form + zod + zodResolver. Bans useState for fields, loading, errors, and validation. Use when adding or editing a form, login/signup/settings, <form, useForm, register, Controller, useFieldArray, submit handlers, or any useState that holds input/validation/submit state. Required via app-code-standards for form-shaped work — do not write a useState form first."
---

# Forms Standard

**Load this turn** before any form-shaped `.tsx`. `useState` for fields / loading / errors = fail.

## Required Stack

| Package | Role |
|---|---|
| `react-hook-form` | Form state (`register`, `control`, `useFieldArray`) |
| `zod` | Only validator |
| `@hookform/resolvers/zod` | `zodResolver(schema)` |

## Hard Rules

- No `useState` for fields, board lists, submit/error/validation
- Loading = RHF `formState.isSubmitting` and/or TanStack `isPending` — still no `useState`
- One zod schema. If the action parses the same payload, put it in `src/schemas/` and import it — do not write a second validator in the action
- Repeatable rows / wizards → `useFieldArray` + zod, not `useState` for the list
- Markup (`FieldGroup`, `data-invalid`) → [shadcn](../shadcn/SKILL.md)

## Boilerplate

```tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { loginSchema, type LoginValues } from "@/schemas/auth"

const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginValues) => {
    /* mutation or action */
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}
      <button type="submit" disabled={isSubmitting}>
        Sign in
      </button>
    </form>
  )
}

export default LoginForm
```

A schema used only by one form may stay next to the component. Shared with a server action → `src/schemas/`.

## Controller (no `ref`)

Controlled: `value` + `onChange`. Do not use `defaultValue` on a RHF field.

```tsx
<Controller
  name="role"
  control={control}
  render={({ field }) => (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      {/* items / SelectItem per shadcn */}
    </Select>
  )}
/>
```
