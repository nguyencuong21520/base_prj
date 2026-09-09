# MERN Base Project (TypeScript)

Project is split into:

- `BE`: Node.js + Express + MongoDB API
- `FE`: React + Vite frontend

## Clean Architecture Style

Backend is organized by layers for easy extension:

- `src/config`: app/env/database setup
- `src/models`: MongoDB models
- `src/services`: reusable business logic (OTP, email, user workflows)
- `src/controllers`: request/response handlers
- `src/routes`: HTTP route definitions
- `src/middlewares`: auth/error middlewares
- `src/utils`: technical helpers (JWT, hash, OTP)

## Implemented Features

- Register
- Register OTP verification (email ownership)
- Login with OTP (2-step login)
- Forgot password (email reset token)
- Reset password
- Get me
- Redirect unauthenticated user to `/logout` on frontend

## Run Backend

```bash
cd BE
cp .env.example .env
npm install
npm run dev
```

## Run Frontend

```bash
cd FE
npm install
npm run dev
```

## Run Tests

Both packages use Vitest.

```bash
cd BE && npm test      # unit + API integration tests (in-memory MongoDB)
cd FE && npm test      # unit + component tests (jsdom + React Testing Library)
```

Use `npm run test:watch` while developing.

- `BE/tests/unit`: utils, validators, middlewares (no database).
- `BE/tests/integration`: full HTTP flows through `src/app.ts` via supertest. Each
  test file boots its own throwaway MongoDB (`mongodb-memory-server`, binary is
  downloaded once) and collections are wiped between tests. SMTP and Cloudinary
  are replaced by in-memory recorders, so no test sends email or uploads images.
- `FE`: tests are colocated as `*.test.ts(x)` next to the code under test.

Every push and pull request runs both suites on GitHub Actions
(`.github/workflows/ci.yml`), plus `npm run lint` on the frontend and a
typecheck on each package.

## API Base URL

- Backend: `http://localhost:5000`
- Frontend calls: `http://localhost:5000/api`
