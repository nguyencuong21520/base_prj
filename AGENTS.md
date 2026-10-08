# AGENTS.md

Instructions for AI coding agents (Antigravity, Claude Code, Codex, Cursor, ...) working in this repository.
Read this file first. Detailed conventions: [BE/docs/architecture.md](BE/docs/architecture.md) and [FE/docs/architecture.md](FE/docs/architecture.md).

## Project

A MERN starter for students. Two apps in one repository, each with its own `package.json`:

- `BE/` — Express 5 + TypeScript + MongoDB (Mongoose 9) + Zod 4. JWT auth with optional email OTP.
- `FE/` — React 19 + Vite + TypeScript + TanStack Query 5 + React Hook Form + Zod + shadcn/ui + Tailwind CSS 4.

## Commands (run from the repository root)

| Command | What it does |
|---|---|
| `npm run setup` | Install all dependencies, create `BE/.env` and `FE/.env` from the examples |
| `docker compose up -d` | Start a local MongoDB on port 27017 |
| `npm run seed` | Create demo accounts `demo@example.com / demo1234` and `admin@example.com / admin1234` |
| `npm run dev` | Run backend (http://localhost:5003) and frontend (http://localhost:5173) together |
| `npm test` | Run backend and frontend tests |
| `npm run lint` | Lint the frontend |
| `npm run build` | Typecheck and build both apps |
| `npm run gen:module -- <name>` | Scaffold a new feature (BE + FE + tests) from the `notes` module |
| `npm run gen:module -- <name> --remove` | Delete a generated feature again |

Without SMTP settings, emails (OTP codes, reset codes) are printed in the backend terminal in development;
in production sending answers 503 instead. Without Cloudinary settings, image upload answers 503 and everything
else works. Without `GEMINI_API_KEY`, the AI chat answers 503. `npm run seed` refuses to run with
`NODE_ENV=production`. Behind a proxy, set `TRUST_PROXY=1`. Tests never read `BE/.env`: their variables are in `BE/vitest.config.mts`.

## Adding a feature (follow these steps in order)

1. Run `npm run gen:module -- <singular-kebab-name>` (e.g. `product`, `lesson-plan`). It copies the
   `notes` module, renames everything, and registers the router and the frontend module. It refuses names
   that would clash with existing code (`class`, `page`, `query`, names containing `note`, ...): pick another name.
2. Change the fields. Keep these files in sync:
   - `BE/src/models/<name>.model.ts` — Mongoose schema and `<Name>Document` interface
   - `BE/src/validators/<name>.validator.ts` — Zod schemas for create / update / list query
   - `FE/src/modules/<plural>/types/<name>.types.ts` — TypeScript types
   - `FE/src/modules/<plural>/components/<Name>FormDialog.tsx` — form schema and inputs
   - `FE/src/modules/<plural>/components/<Name>Card.tsx` — how one item is displayed
3. Update the generated tests (`BE/tests/integration/<plural>.test.ts`, `FE/src/modules/<plural>/pages/*.test.tsx`) for the new fields.
4. Run `npm test`, `npm run lint` and `npm run build`. All must pass.

Use `notes` as the reference for anything not covered here: `BE/src/{models,validators,services,controllers,routes}/note.*`
and `FE/src/modules/notes/`.

## Backend rules

- Layers: `routes → middlewares → controllers → services → models`. Controllers stay thin; queries and rules live in services.
- Validate every input with `validate({ body, query, params })` from `middlewares/validate.middleware.ts`.
  Reuse `idParamsSchema` and `booleanQuerySchema` from `validators/common.validator.ts`.
- List endpoints: extend `paginationQuerySchema` with `sort: sortSchema([...allowed fields])` and return
  `paginate(Model, filter, query)` from `utils/pagination.ts`. The body is `{ items, page, limit, total, totalPages }`.
  Never allow sorting by private fields.
- Expected failures: `throw notFound('...')`, `badRequest`, `forbidden`, `conflict`, or `new AppError(status, message)`
  from `utils/app-error.ts`. Never send error responses by hand; never wrap handlers in try/catch (Express 5 forwards rejections).
- Protected routes: `authGuard`. Role checks: `requireRole('admin')` (also sets `req.user.role`).
- Ownership: filter queries by `owner: actor.id`; another user's resource answers 404, as in `note.service.ts`.
- Image uploads: `imageUpload.single('<field>')` from `middlewares/upload.middleware.ts` + `uploadImage()` from `services/cloudinary.service.ts`.
- Configuration: add variables to the Zod schema in `config/env.ts` and to `BE/.env.example`. Never read `process.env` elsewhere.
- Never return `password`, OTP or reset fields. The User model strips them in `toJSON`; keep it that way for new private fields.
  `.lean()` and `aggregate()` skip `toJSON`: when you use them on users, `.select()` the public fields explicitly.
- Do not change the OTP functions (`utils/otp.ts`, `createUserWithOtp`, `issueOtpForUser`, `issueResetToken`, and the OTP/reset handlers in `auth.controller.ts`).

## AI chat bot (Google Gemini, free tier)

A sample chat bot to customize, not a finished product:

- Backend: `POST /api/chat` with `{ messages: [{ role: 'user' | 'model', text }] }` → `{ reply }`. Stateless: the client sends
  the conversation each time. Signed-in users only, 10 messages per minute per user.
- Personality: `BE/src/config/chatbot.ts` (system prompt, thinking level, history length; Gemini 3.5 ignores temperature). Gemini calls: `BE/src/services/ai.service.ts`
  (`generateChatReply`, uses `@google/genai`; never the deprecated `@google/generative-ai`).
- Frontend: `FE/src/modules/chat/` — texts and suggested questions in `chat.config.ts`, conversation state in `hooks/use-chat.ts`.
- Config: `GEMINI_API_KEY` (free at https://aistudio.google.com/apikey) and `GEMINI_MODEL` (default `gemini-3.5-flash-lite`, thinking level `LOW`) in `BE/.env`.
  Without a key the endpoint answers 503. Free-tier quota errors answer 429. Never put the key in frontend code.
- Tests never call Google: `@google/genai` is mocked in `BE/tests/setup/mock-external-services.ts`; control replies and
  errors with `BE/tests/helpers/gemini-recorder.ts`.

## Frontend rules

- One folder per feature in `FE/src/modules/<feature>/` with `api/ hooks/ components/ pages/ types/` and a `<feature>.module.ts`.
  Register the module in `FE/src/app/modules.ts`; routes and nav links come from there. Do not edit `App.tsx` for feature pages.
- HTTP only through the `http` instance (`shared/api/http.ts`). API functions return the response body: `http.get<T>(url).then((r) => r.data)`.
- Server data only through TanStack Query hooks in `hooks/use-<feature>.ts` (see `modules/notes/hooks/use-notes.ts`):
  a key factory, `useQuery` for reads, `useMutation` + `invalidateQueries` for writes. No `useEffect` + `useState` fetching.
- The signed-in user: `useCurrentUser()`; after changing it, `useSetCurrentUser()` or invalidate `currentUserKey`.
- Mutations without `onError` show the backend message as a toast automatically. Add `onError` only for custom handling.
- Forms: React Hook Form + `zodResolver`, laid out with `FormField` (`shared/components/form-field.tsx`).
- Reuse shared UI before writing new: `PageHeader`, `EmptyState`, `ErrorState`, `LoadingState`, `ConfirmDialog`, `Pagination`
  (`shared/components/`), shadcn primitives (`shared/components/ui/`), hooks `useDebounce`, `usePagination` (`shared/hooks/`).
- Imports use the `@/` alias. Components and pages are `PascalCase.tsx` named exports; other files are `kebab-case.ts`.

## Testing rules

- Backend integration tests use `api()` from `BE/tests/helpers/api.ts` (not `request(app)`), `createUser` / `bearerFor`
  from `tests/helpers/user-factory.ts`, and an in-memory MongoDB. Emails land in `tests/helpers/email-outbox.ts`.
- Frontend tests mock the feature's `api` module and render with `renderWithProviders` from `FE/src/test/render-with-providers.tsx`.
- Every new endpoint or page gets tests; do not weaken or delete existing tests to make a change pass.

## Before you finish

Run `npm test`, `npm run lint` and `npm run build` from the root and fix every failure. Mention any step you could not run.
