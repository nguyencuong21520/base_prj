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

## API Base URL

- Backend: `http://localhost:5000`
- Frontend calls: `http://localhost:5000/api`
