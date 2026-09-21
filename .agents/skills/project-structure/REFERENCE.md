# Project Structure — Reference

## I/O boundaries

| Layer | Allowed | Forbidden |
|---|---|---|
| `services/` | Client connect, SDK init, send-only (`getDb`, SES `sendHtml`, Slack post) | `insertOne`, domain queries, collection maps, email HTML, membership, RBAC |
| `actions/.../index.ts` | Orchestration, Mongo, auth flows, notify fan-out | Re-export-only wrappers of a sibling action |
| `lib/` | Pure helpers, HTML, filters, serialize, capability predicates | `getDb`, `fetch`, SDK send |
| `types/` | Shared shapes | Runtime I/O |
| `schemas/` | Zod used by forms and/or actions | |

**Pattern A folder = two files.** `index.ts` (server) + `use[ActionName].ts` (client). No `helpers.ts`, `types.ts`, or domain dumps beside them. Shared pure code → `lib/`. Shared I/O → non-exported `const` in the **owning** `index.ts`, or a folder that **contains the function body**.

**Do not** create `updateFoo/index.ts` that only `return otherAction(input)`. Fold the body into `updateFoo/index.ts` (or keep one action if they are the same operation).

## `"use server"` (Next App Router)

When the client hook imports `./index`, that file needs **file-level** `"use server"`.

- Every **exported** binding must be an **async function**.
- Those fns **must `await`** (Biome `useAwait`). Do not drop `async` to silence lint — Next rejects non-async exports.
- Do **not** export consts, sync helpers, or values (`IST_TZ`, maps). Move to `lib/` / `types/` / `schemas/`.
- Do **not** use inline `"use server"` on one function to dodge that; it fails when the file is on the client import graph.
- Prefer `export type` from `types/` / `lib/`, not from the server file.
- Keep `return await fn(...)` on one line (ASI: `return` then newline then expr → `undefined`; formatters can join `return` + `}` → `return }`).

## Who imports what

| Caller | Import |
|---|---|
| Client component / organism | `use[ActionName].ts` only |
| RSC page / layout | `index.ts` (the action fn) |
| `app/api/**/route.ts`, cron | `index.ts` — handler stays thin |

`use*.ts` is the only place a client file should name `./index` (`queryFn` / `mutationFn`). Skip `use*.ts` when there is no client caller (cron-only).

## `app/api/` — thin handlers

`route.ts` = parse request, call an action, map the HTTP envelope. Do **not** put Mongo/SDK orchestration in the route. Envelope/versioning → `api-contracts`.

## `actions/` Patterns

### Pattern A — Folderized (TanStack Query installed)

```
actions/
└── [domain]/
    └── [actionName]/
        ├── index.ts           ← "use server"; exported async actions only
        └── use[ActionName].ts ← "use client", TanStack Query hook
```

**`index.ts` — without `"use server"` (server-only module, never imported by a client `use*`):**
```ts
import { parseFirestoreError } from "@/lib/firebase"
import { db } from "@/services/firebase/client"

export const getUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) throw new UserNotFoundError(`User not found: ${userId}`)
    return { id: userId, ...userSnap.data() }
  } catch (error) {
    if (error instanceof UserNotFoundError) throw error
    throw parseFirestoreError(error as { code?: string; message?: string })
  }
}
```

**`index.ts` — with file-level `"use server"` (required when `use*` imports this file):**
```ts
"use server"

import { fetchClientWithToken } from "@/services/fetch"
import { cookies } from "next/headers"

export const verifyOTP = async (body: RequestBody) => {
  const resp = await fetchClientWithToken("/v1/auth/verify", { method: "POST", body })
  if (resp.error) return resp
  const cookieStore = await cookies()
  cookieStore.set(`${process.env.NEXT_PUBLIC_COOKIE_KEY}_access`, resp.data?.token as string)
  return resp
}
```

**`use[ActionName].ts` — mutation with store dispatch + cache invalidation:**
```ts
"use client"

import useStore from "@/store"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateUserProfile } from "./index"

const useUpdateUserProfile = () => {
  const dispatch = useStore((store) => store.dispatch)
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["user", "updateProfile"],
    mutationFn: updateUserProfile,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", "profile", variables.userId] })
      dispatch({ type: "SET_USER", payload: variables.updates })
    },
    onError: (error) => { console.error("Update user profile error:", error) },
  })
}

export default useUpdateUserProfile
```

**`use[ActionName].ts` — query with staleTime/gcTime:**
```ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { getUserProfile } from "./index"

const useGetUserProfile = (userId: string) => {
  return useQuery({
    queryKey: ["user", "profile", userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime: 1000 * 60 * 60,    // 1 hour
  })
}

export default useGetUserProfile
```

**Hook callback pattern** — accept optional callbacks for caller-specific logic:
```ts
const useSignIn = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: Awaited<ReturnType<typeof signIn>>) => void
  onError?: (error: Error) => void
} = {}) => {
  const dispatch = useStore((store) => store.dispatch)

  return useMutation({
    mutationKey: ["auth", "signIn"],
    mutationFn: signIn,
    onSuccess: (data) => {
      dispatch({ type: "SET_USER", payload: { id: data.uid, email: data.email } })
      dispatch({ type: "SET_IS_AUTHENTICATED", payload: true })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message)
      onError?.(error)
    },
  })
}

export default useSignIn
```

**Key rules:**
- `index.ts` never has `"use client"`
- `use[ActionName].ts` always starts with `"use client"`
- `dispatch` accessed via `useStore((store) => store.dispatch)` — not destructured at top level
- `mutationKey`/`queryKey` follow `["domain", "actionName"]` pattern
- `queryClient.invalidateQueries` after mutations that affect cached data
- Folder owns the **body**. Sibling folders are not passthrough re-exports.

---

### Pattern B — Flat Server Actions (no TanStack)

```
actions/
└── auth.ts    ← "use server" at file level
```

```ts
"use server"

import { fetchClientWithToken, fetchClientWithoutToken } from "@/services/fetch"
import { cookies } from "next/headers"

export const sendOTP = async (body: RequestBody) => {
  return await fetchClientWithoutToken("/v1/auth/send", { method: "POST", body })
}

export const verifyOTP = async (body: RequestBody) => {
  const resp = await fetchClientWithoutToken("/v1/auth/verify", { method: "POST", body })
  if (resp.error) return resp
  const cookieStore = await cookies()
  cookieStore.set(`${process.env.NEXT_PUBLIC_COOKIE_KEY}_access`, resp.data?.token as string)
  return resp
}

export const logout = async () => {
  const cookieStore = await cookies()
  cookieStore.delete(`${process.env.NEXT_PUBLIC_COOKIE_KEY}_access`)
}
```

**Key rules:** file-level `"use server"`, exported fns are `async` + `await`, uses `@/services/fetch` wrappers (connect only), domain-named file (`auth.ts`, `user.ts`), no co-located hooks.

---

### Choosing Between Patterns

| Condition | Pattern |
|---|---|
| TanStack Query installed | Folderized (A) |
| Need loading/error/cache state in UI | Folderized (A) |
| Simple server mutation, no caching | Flat `"use server"` (B) |

---

## `store/` Patterns

### `store/index.ts`

```ts
import { create } from "zustand"
import { devtools, redux } from "zustand/middleware"
import type { StoreState } from "@/types/store"
import { reducer } from "./reducer"

export const initialState: StoreState = {
  user: null,
  authId: null,
  openAuth: false,
  closableAuth: true,
  isAuthenticated: false,
  queryParams: {},
}

const useStore = create(
  devtools(redux(reducer, initialState), {
    name: "useStore",
    enabled:
      (typeof window !== "undefined" &&
        Boolean(window["__REDUX_DEVTOOLS_EXTENSION_COMPOSE__"])) ||
      process.env.VERCEL_ENV !== "production",
  })
)

export default useStore
```

### `store/reducer.ts`

```ts
import { produce } from "immer"
import type { StoreState } from "@/types/store"

export const reducer = (
  state: StoreState,
  { type, payload }: { type: string; payload: unknown }
) => {
  switch (type) {
    case "SET_STATE":
      return produce(state, (draft) => {
        Object.assign(draft, payload)
      })
    case "SET_USER":
      return produce(state, (draft) => {
        draft.user = payload
          ? (Object.assign(draft.user || {}, payload) as StoreState["user"])
          : null
      })
    case "SET_IS_AUTHENTICATED":
      return produce(state, (draft) => {
        draft.isAuthenticated = payload as boolean
      })
    case "RESET":
      return produce(state, (draft) => {
        draft.user = null
        draft.authId = null
        draft.isAuthenticated = false
      })
    default:
      return state
  }
}
```

### `types/store.ts` — Adding New Domain State

```ts
// Add fields here when the store needs new domain state
export interface StoreState {
  user: User | null
  authId: string | null
  openAuth: boolean
  closableAuth: boolean
  isAuthenticated: boolean
  queryParams: Record<string, string>
  // Add new fields here, then add corresponding cases in reducer.ts
}
```

### Dispatching from Components or Providers

```ts
// Access dispatch — always via selector, not destructure
const dispatch = useStore((store) => store.dispatch)

dispatch({ type: "SET_USER", payload: { id: "1", email: "user@example.com" } })
dispatch({ type: "SET_IS_AUTHENTICATED", payload: true })
dispatch({ type: "RESET", payload: undefined })
```

### Incorrect Patterns

```ts
// ✗ Slice files — no slices in this pattern
// store/userSlice.ts  ← doesn't exist

// ✗ Extra store files — dispatch helpers → lib/; network → actions/.../use*.ts
// store/examDraft.ts
// store/syncWorkspaceSession.ts

// ✗ Direct set() — bypasses reducer
const { setState } = useStore
setState({ user: data })  // ← wrong

// ✗ Manual spread in reducer — use produce instead
case "SET_USER": return { ...state, user: payload }  // ← wrong

// ✗ Feature slice composition — single flat reducer only
export const useStore = create((...a) => ({
  ...createUserSlice(...a),  // ← wrong
}))
```

Second Zustand store (`store/examDraft/index.ts` + `reducer.ts`) only if that domain is independent shared state. Otherwise keep fields on the root reducer; easing helpers live in `lib/`.

## `providers/`

Must use Zustand, not `useState` + `createContext`. Hydrate with server-passed `initial*` from a layout and/or Pattern A `use*`. Do not gate `children` on Zustand `user == null` when the session was already loaded on the server (HMR flash).

## `types/` and `schemas/`

- `types/member.ts`, `types/workspace.ts`, `types/store.ts` — shapes only.
- `schemas/exam.ts` — zod shared by RHF and action `safeParse`. Do not keep a second validator in the `"use server"` file.
