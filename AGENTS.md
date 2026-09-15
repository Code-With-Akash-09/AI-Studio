<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-rules -->

# AI Studio — Project Rules

These rules apply to **every** AI assistant working in this repository (Claude, Codex, Copilot, Cursor, Antigravity, etc.).  
Read and follow them **without exception** before writing or editing any code.

---

## 1 · Theme — Light Only

- The application **must use the light theme exclusively**.
- Use crisp light backgrounds (`bg-white`, `bg-slate-50`), dark text (`text-slate-900`, `text-slate-600`), and subtle borders (`border-slate-200`).
- Do **not** add `dark:` Tailwind variants, `prefers-color-scheme: dark` media queries, dark radial gradients, or any dark-mode toggle.
- All colour tokens, CSS variables, and shadcn theme configuration must be defined for light mode only.

---

## 2 · Styling — Tailwind CSS Inline Classes Only

- Use **standard Tailwind CSS inline utility classes** (e.g. `className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200"`) for all layout, spacing, typography, and styling.
- Do **not** create custom CSS classes (such as `.btn`, `.card`, `.badge-purple`, `.input`) in `globals.css` or CSS files.
- Do **not** use raw inline `style={{ ... }}` objects for layout or component styling — use Tailwind CSS utility classes instead.

---

## 3 · UI Components — shadcn/ui Everywhere

- Use **shadcn/ui** components for **every** UI element across the website (`Button`, `Badge`, `Card`, `Input`, `Dialog`, `Select`, `Tabs`, `Separator`, `Avatar`, `Sheet`, `Textarea`, `Tooltip`, etc.).
- Never render raw unstyled HTML buttons/cards when a shadcn component exists.
- If a required component does not yet exist in `src/components/ui/`, install it with:
  ```
  pnpm dlx shadcn@latest add <component-name>
  ```
- Custom components must be composed on top of existing shadcn primitives inside the atomic layer (see Rule 4).

---

## 4 · Atomic Folder & File Structure

Organise **all** components under `src/components/` using Atomic Design:

```
src/components/
  atoms/       ← smallest, stateless UI units (Button wrappers, Label, Badge, Icon wrappers …)
  molecules/   ← combinations of atoms with light logic (FormField, SearchBar, StatCard …)
  organisms/   ← complex, self-contained sections (Header, Sidebar, DataTable …)
  ui/          ← raw shadcn-generated files (do NOT edit manually)
```

- Every component lives in its own folder with an `index.jsx` (or `.tsx`) file.
- Never place business-logic components directly in `src/components/ui/`.

---

## 5 · API Calls — `/actions` Folder

- **Never** call an API endpoint or `fetch`/`axios` directly inside a page or component.
- All HTTP/fetch/axios calls must live in `src/actions/` organised by module:

```
src/actions/
  auth.js
  chat.js
  models.js
  videos.js
  …
```

- Each function in an actions file is a plain async function that performs exactly one API call and returns the raw data or throws a typed error.

---

## 6 · Data-Fetching — TanStack Query Hooks

- **Never** call action functions directly from pages or components.
- Wrap every action in a custom hook inside `src/hooks/` using **TanStack Query** (`@tanstack/react-query`):
  - `useQuery` / `useInfiniteQuery` for reads
  - `useMutation` for writes
- Hook naming convention: `use<Resource><Operation>` — e.g. `useModelsList`, `useVideoGenerate`, `useChatSend`.
- Pages and components **only** consume these hooks.

---

## 7 · Global State — Zustand + Immer

- Use **Zustand** with the **Immer** middleware for all global/shared state.
- The single store must be named **`useAIStore`** and live at `src/store/useAIStore.js`.
- Slice the store logically (auth slice, video slice, chat slice, settings slice, …) but export a single combined store.
- Do **not** use React Context or Redux for global state.

---

## 8 · Constants — `/constants` Folder

- **Never** hardcode constant data (model lists, API base URLs, route names, enum-like values, pricing plans, etc.) inside pages or components.
- All constants must live in `src/constants/` organised by concern:

```
src/constants/
  models.js     ← AI model definitions
  routes.js     ← named route paths
  api.js        ← base URLs, endpoint paths
  …
```

- Import from the constants file, never inline the values.

---

<!-- END:project-rules -->
