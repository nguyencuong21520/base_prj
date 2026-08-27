# Backend Architecture & Conventions

> Instruction doc for AI agents and developers. Read this before adding or changing backend code. Follow these patterns exactly — do not introduce new architectural styles without reason.

## Stack

- **Runtime**: Node.js + Express 5
- **Language**: TypeScript (strict mode, CommonJS output)
- **Database**: MongoDB via Mongoose 9
- **Auth**: JWT (Bearer token) + email OTP (2-step)
- **Validation**: Zod 4
- **Media**: Cloudinary (avatar upload via Multer memory storage)
- **Email**: Nodemailer (SMTP)
- **Dev**: `tsx watch` · **Build**: `tsc` → `build/` · **Start**: `node build/server.js`

## Layered (Clean) Architecture

Request flows strictly top-to-bottom. Never skip a layer or call upward.

```
HTTP request
  → routes/         define endpoints, attach middlewares
  → middlewares/    authGuard → validateBody → (multer for files)
  → controllers/    read req, call service/model, shape res — NO business logic reuse here
  → services/       reusable business logic + side effects (email, cloudinary, otp)
  → models/         Mongoose schemas + documents
  → config/         env, db, cloudinary clients
  → utils/          pure technical helpers (jwt, hash, otp)
```

### Layer responsibilities

| Layer | Owns | Must NOT |
|-------|------|----------|
| `routes/` | URL + verb + middleware chain | contain logic |
| `controllers/` | req/res handling, status codes, response shape | be reused by other controllers |
| `services/` | multi-step workflows, side effects, cross-model logic | touch `req`/`res` |
| `models/` | schema, field types, DB-level constraints | contain HTTP concerns |
| `validators/` | Zod schemas + inferred input types | run queries |
| `middlewares/` | auth, validation, error handling | contain feature logic |
| `utils/` | pure, stateless helpers | import models/services |
| `config/` | env parsing, client/connection setup | contain feature logic |

**Rule of thumb**: If logic is used by exactly one controller and is simple, inline it in the controller. If it has side effects (email, upload) or is shared, put it in a service.

## Directory Map

```
src/
├── app.ts               # express app: cors, json, rate-limit, mount routers, error mw
├── server.ts            # connectDb() then app.listen()
├── config/
│   ├── env.ts           # single typed env object; throws if required vars missing
│   ├── db.ts            # mongoose connection
│   └── cloudinary.ts    # cloudinary client config
├── models/              # <name>.model.ts — Mongoose schemas
├── validators/          # <name>.validator.ts — Zod schemas + inferred types
├── services/            # <name>.service.ts — business logic + side effects
├── controllers/         # <name>.controller.ts — exported handler functions
├── routes/              # <name>.route.ts — export <name>Router
├── middlewares/         # auth / validate / error
├── utils/               # jwt, hash, otp
└── types/express.d.ts   # augments Express Request (e.g. req.user)
```

## Naming Conventions

- Files: `kebab-case` with layer suffix — `profile.controller.ts`, `auth.validator.ts`, `user.model.ts`.
- Routers: exported as `<feature>Router` (e.g. `profileRouter`).
- Models: exported as `<Name>Model` + `<Name>Document` interface.
- Controllers: named exports, one function per endpoint (`updateProfile`, `uploadAvatar`).
- Validators: `<action>Schema` + inferred `<Action>Input` type.

## Core Patterns

### 1. Environment (`config/env.ts`)
All env access goes through the typed `env` object — never read `process.env` elsewhere. Add new vars there with a sensible default, and add hard-fail checks for required secrets:

```ts
export const env = { port: Number(rawEnv.PORT ?? 5000), /* ... */ };
if (!env.mongoUri || !env.jwtSecret) throw new Error('Missing required environment variables');
```
Mirror every new var in `.env.example`.

### 2. Routes → middleware chain
Standard order: `authGuard` (if protected) → `validateBody(schema)` → controller. File uploads use `multer` before the controller.

```ts
profileRouter.patch('/', authGuard, validateBody(updateProfileSchema), updateProfile);
profileRouter.post('/avatar', authGuard, upload.single('avatar'), uploadAvatar);
```
Mount the router in `app.ts` under `/api/<feature>`.

### 3. Validation (`validateBody`)
Zod schema `.parse()` replaces `req.body` with the parsed value; failures return `400` with `{ message, errors: [{ field, message }] }`. Define schemas in `validators/` and export the inferred input type for controllers to cast against:

```ts
export const updateProfileSchema = z.object({ displayName: z.string().trim().min(1).max(100).optional() /* ... */ });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

### 4. Auth (`authGuard` + JWT)
`authGuard` reads `Authorization: Bearer <token>`, verifies via `utils/jwt`, and sets `req.user = { sub, email }` (typed in `types/express.d.ts`). Controllers read the user id via `req.user?.sub`. Token is signed at successful login-OTP verification.

### 5. Controllers
Keep thin. Read validated `req.body`/`req.user`, call model/service, return explicit status codes. Never leak sensitive fields — profile responses use `EXCLUDED_FIELDS` (`-password -otpCode -otpExpiresAt -resetToken -resetTokenExpiresAt`) via `.select()`.

```ts
export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  const { displayName, bio, phone } = req.body as UpdateProfileInput;
  const user = await UserModel.findByIdAndUpdate(userId, { displayName, bio, phone },
    { new: true, runValidators: true }).select(EXCLUDED_FIELDS);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(user);
};
```

### 6. Services (side effects & workflows)
Multi-step flows with side effects live here — never in controllers. Return `null` on "not found / conflict" and let the controller translate to a status code.

```ts
export const createUserWithOtp = async (email, password) => {
  if (await UserModel.findOne({ email })) return null;   // controller → 409
  const user = await UserModel.create({ email, password: await hashPassword(password), otpCode: generateOtp(), otpExpiresAt: otpExpiry() });
  await sendOtpEmail(email, otp);
  return user;
};
```

### 7. Error handling
`errorMiddleware` is mounted last in `app.ts` and returns `500 { message }`. For thrown errors in async handlers, Express 5 forwards rejections automatically. Use explicit status codes (`400/401/403/404/409`) inside handlers for expected outcomes.

### 8. Models
Define a `<Name>Document` interface + `Schema`, enable `{ timestamps: true }`, apply DB-level constraints (`unique`, `trim`, `lowercase`, `maxlength`). Validation is duplicated at two levels by design: Zod (request shape) + Mongoose (persistence).

## HTTP Response Conventions

| Situation | Status | Body |
|-----------|--------|------|
| Success (data) | 200 | the resource / `{ ...fields }` |
| Created | 201 | `{ message }` |
| Accepted (OTP step) | 202 | `{ message, requiresOtp, email }` |
| Validation error | 400 | `{ message, errors: [{ field, message }] }` |
| Unauthorized | 401 | `{ message }` |
| Forbidden (unverified) | 403 | `{ message }` |
| Not found | 404 | `{ message }` |
| Conflict (dup email) | 409 | `{ message }` |
| Server error | 500 | `{ message }` |

All API routes are mounted under `/api`. Health check: `GET /health` → `{ ok: true }`.

## Security Rules

- Never return `password`, `otpCode`, `resetToken`, or their expiry fields — always `.select(EXCLUDED_FIELDS)`.
- Passwords hashed with bcrypt (`utils/hash`); never store plaintext.
- OTP / reset tokens are single-use — clear (`= undefined`) after successful verification.
- Global rate limit: 300 req / 15 min (`app.ts`). Tighten per-route if adding sensitive endpoints.
- CORS locked to `env.clientUrl`.
- Uploads: memory storage, 5 MB cap, MIME allow-list (`jpeg/png/webp/gif`) — enforce both in `multer` config and re-check where relevant.

## Playbook: Add a New Feature Endpoint

1. **Model** — add/extend schema in `models/<name>.model.ts` (constraints + `Document` interface).
2. **Validator** — Zod schema + inferred type in `validators/<name>.validator.ts`.
3. **Service** — if side effects / reuse / multi-step, add `services/<name>.service.ts`.
4. **Controller** — thin handler in `controllers/<name>.controller.ts` returning correct status codes; strip sensitive fields.
5. **Route** — `routes/<name>.route.ts`: `export const <name>Router`, chain `authGuard`/`validateBody`.
6. **Mount** — `app.use('/api/<name>', <name>Router)` in `app.ts`.
7. **Env** — add any new vars to `config/env.ts` (typed + default/guard) and `.env.example`.
8. **Verify** — `npm run build` (tsc) must pass with no errors.

## Do / Don't

- ✅ Keep controllers thin; push side effects to services.
- ✅ Validate every request body with Zod via `validateBody`.
- ✅ Route all config through `env`; mirror in `.env.example`.
- ✅ Return typed, sensitive-field-stripped responses.
- ❌ Don't read `process.env` outside `config/env.ts`.
- ❌ Don't put business logic in routes or reuse controllers from controllers.
- ❌ Don't return raw Mongoose documents that include secrets.
- ❌ Don't add new top-level folders without a clear layer justification.
