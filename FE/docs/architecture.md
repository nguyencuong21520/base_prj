# Frontend Architecture & Conventions

> Instruction doc for AI agents and developers. Read this before adding or changing frontend code. Follow these patterns exactly — do not introduce new architectural styles without reason.

## Stack

- **Framework**: React 19 + TypeScript (strict)
- **Build**: Vite 8
- **Routing**: React Router 7 (`react-router-dom`)
- **HTTP**: Axios (single shared `http` instance with interceptors)
- **Forms**: React Hook Form 7 + Zod 4 (`@hookform/resolvers`)
- **UI**: shadcn/ui (Radix primitives) + Tailwind CSS 4
- **Icons**: `lucide-react` · **Toasts**: `sonner`
- **Dev**: `vite` · **Build**: `tsc -b && vite build` · **Lint**: `eslint .`

## Feature-Module Architecture

Code is organized by **feature module**, not by file type. Each module is self-contained and owns its pages, components, api, types, and (if needed) store/routes.

```
src/
├── main.tsx                 # root render: BrowserRouter + App + Toaster; applyTheme()
├── App.tsx                  # central route table (see Routing)
├── index.css                # Tailwind + theme tokens
├── modules/
│   ├── auth/
│   │   ├── api/             # auth.api.ts — endpoint calls
│   │   ├── components/      # AuthLayout, ProtectedRoute
│   │   ├── pages/           # LoginPage, RegisterPage, ...
│   │   ├── routes/          # auth.routes.tsx (route fragment)
│   │   ├── store/           # token.store.ts (localStorage wrapper)
│   │   └── types/           # auth.types.ts
│   ├── profile/
│   │   ├── api/             # profile.api.ts
│   │   ├── components/      # AvatarUpload, ProfileEditForm
│   │   └── pages/           # ProfilePage
│   └── home/
│       └── pages/           # HomePage
└── shared/                  # cross-module, feature-agnostic code
    ├── api/http.ts          # shared axios instance + interceptors
    ├── components/
    │   ├── layout/          # AppLayout (protected shell)
    │   └── ui/              # shadcn/ui primitives (button, input, dialog, ...)
    └── lib/utils.ts         # cn(), theme helpers
```

### Module vs Shared — where does code go?

| Put it in a `module/` when... | Put it in `shared/` when... |
|-------------------------------|------------------------------|
| Logic belongs to one feature (auth, profile) | Reused across ≥2 features |
| Page, feature component, feature API call | Generic UI primitive (button, input) |
| Feature-specific types/store | Axios instance, `cn()`, theme helpers |

**Rule**: default to the feature module. Promote to `shared/` only when a second module needs it.

### Internal module layout

Each module uses the same folder vocabulary — create only the subfolders it needs:
`api/` · `components/` · `pages/` · `routes/` · `store/` · `types/`.

## Naming Conventions

- Folders & non-component files: `kebab-case` — `profile.api.ts`, `token.store.ts`, `auth.types.ts`.
- React components & pages: `PascalCase.tsx` — `ProfileEditForm.tsx`, `LoginPage.tsx`.
- Exports: named (not default) for components/pages — `export const ProfilePage = ...`. (`App` is the one default export.)
- API modules: export a single object — `export const profileApi = { ... }`.
- Route fragments: `export const <feature>Routes` returning `<Route>` JSX.

## Path Aliases

Use `@/` for all `src`-relative imports (configured in `tsconfig` + Vite):

```ts
import { Button } from '@/shared/components/ui/button';
import { profileApi } from '@/modules/profile/api/profile.api';
```
Avoid deep relative chains (`../../../`) for cross-module imports.

## Core Patterns

### 1. HTTP layer (`shared/api/http.ts`)
One shared Axios instance. **Never call `axios` directly** or hardcode base URLs in components — import `http`.

- Base URL from `import.meta.env.VITE_API_BASE_URL` (fallback `http://localhost:5003/api`).
- **Request interceptor** injects `Authorization: Bearer <token>` from `tokenStore`.
- **Response interceptor** on `401` → clears token and redirects to `/logout`.

### 2. Feature API modules (`modules/<f>/api/<f>.api.ts`)
Wrap endpoints in a typed object using `http`. Components never build URLs themselves.

```ts
export const profileApi = {
  updateProfile: (data: { displayName?: string; bio?: string; phone?: string }) =>
    http.patch('/profile', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return http.post('/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
```

### 3. Auth token (`modules/auth/store/token.store.ts`)
JWT persisted in `localStorage` behind a tiny `tokenStore` wrapper (`get/set/clear`). Access tokens only through it — never touch `localStorage` for auth directly.

### 4. Routing (`App.tsx`)
Central route table. Two shells:
- **`AuthLayout`** wraps public auth pages (`/login`, `/register`, `/forgot-password`).
- **`ProtectedRoute` + `AppLayout`** wrap authenticated pages (`/`, `/profile`).
`ProtectedRoute` redirects unauthenticated users; unknown paths → `/login`. Per-module `routes/*.routes.tsx` fragments exist for composition — keep new protected pages inside the `ProtectedRoute`/`AppLayout` group.

```tsx
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="/profile" element={<ProfilePage />} />
</Route>
```

### 5. Forms (React Hook Form + Zod)
Every form uses `useForm` + `zodResolver`. Define a Zod schema, infer types, render inline field errors. Mirror backend validation constraints (the BE re-validates — FE validation is UX, not trust).

```tsx
const schema = z.object({ displayName: z.string().trim().min(2).max(100) /* ... */ });
type FormValues = z.input<typeof schema>;
type SubmitValues = z.output<typeof schema>;

const { register, handleSubmit, formState: { errors } } =
  useForm<FormValues, unknown, SubmitValues>({ resolver: zodResolver(schema), defaultValues });
```
- Strip empty optional strings to `undefined` before submit so the BE doesn't reject `''`.
- Show errors as `{errors.field && <p className="text-xs text-destructive">{errors.field.message}</p>}`.
- On submit: call the feature `api`, `toast.success(...)` / `toast.error(err?.response?.data?.message ?? 'fallback')`, manage a local `saving` state to disable the submit button.

### 6. UI components (`shared/components/ui/`)
shadcn/ui primitives (Radix + CVA + Tailwind). **Reuse these** — don't hand-roll buttons/inputs/dialogs. Compose class names with `cn()` from `@/shared/lib/utils`. Add new shadcn components into this folder; keep them generic and unopinionated.

### 7. Styling & theme
Tailwind CSS 4 utility classes + design tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `text-destructive`, `ring-ring`, etc.) — use tokens, not raw colors, so light/dark themes work. Theme is applied at boot via `applyTheme(getTheme())` in `main.tsx`; toggled with `theme-toggle`.

### 8. Notifications
User feedback via `sonner` `toast`. `<Toaster />` is mounted once in `main.tsx`. Use `toast.success` / `toast.error` — don't build custom alert UI for transient messages.

## Playbook: Add a New Feature Module

1. **Create module folder** `src/modules/<feature>/` with the subfolders you need (`pages/`, `components/`, `api/`, `types/`).
2. **Types** — `types/<feature>.types.ts` for request/response/domain types.
3. **API** — `api/<feature>.api.ts`: export a `<feature>Api` object using the shared `http`.
4. **Components/Pages** — `PascalCase.tsx`, named exports; reuse `shared/components/ui/*`.
5. **Forms** — RHF + Zod, inline errors, mirror BE validation, toast on submit.
6. **Route** — add the page to `App.tsx` (inside `ProtectedRoute`/`AppLayout` if authenticated).
7. **Imports** — use `@/` aliases; put anything reused by another module in `shared/`.
8. **Verify** — `npm run build` (tsc + vite) and `npm run lint` must pass.

## Do / Don't

- ✅ Organize by feature module; keep features self-contained.
- ✅ Call the backend only through the shared `http` + feature `api` objects.
- ✅ Validate forms with Zod; mirror BE rules; strip empty optionals before submit.
- ✅ Reuse `shared/components/ui/*` and Tailwind theme tokens; compose with `cn()`.
- ✅ Use `@/` path aliases and named exports.
- ❌ Don't call `axios` directly or hardcode API URLs in components.
- ❌ Don't read/write auth token from `localStorage` outside `tokenStore`.
- ❌ Don't hardcode hex colors — use theme tokens.
- ❌ Don't put feature code in `shared/`, or leak cross-feature imports between modules.
