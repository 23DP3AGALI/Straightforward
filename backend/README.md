# Straightforward API

Backend uses Node.js, Express, and PostgreSQL.

## Run locally

1. Create a PostgreSQL database named `straightforward`.
2. From the repository root, apply the schema:

   ```powershell
   psql -d straightforward -f database/migrations/001_init.sql
   ```

3. In `backend`, copy `.env.example` to `.env` and set `DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters. Set `ADMIN_EMAIL`, `ADMIN_NICK`, and `ADMIN_PASSWORD` to create the first admin account on startup.
4. Install dependencies and start the API:

   ```powershell
   npm install
   npm run dev
   ```

The API listens on `http://localhost:3000`. Health check: `GET /api/health`. Authenticated requests use `Authorization: Bearer <token>`.

Start the frontend separately from `frontend` with `npm install` and `npm run dev`; Vite forwards `/api` requests to this API. After starting the API, sign in with the administrator credentials from `.env`, open `/admin`, and add games before users can create profiles.

## Routes

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/games`, `GET /api/games/:id`; admins can create, edit, and delete games at `/api/games`
- `GET /api/games/:gameId/profiles`, `GET|PUT|DELETE /api/games/:gameId/profiles/me`
- `POST /api/games/:gameId/profiles/:profileId/reactions` with `{ "type": "like" | "dislike" }`
- `POST /api/games/:gameId/profiles/:profileId/reports` with `{ "reason": "..." }`
- Admin moderation: `GET /api/admin/reports`, `POST /api/admin/reports/:reportId/review`, and ban/lift-ban routes under `/api/admin/users/:userId/bans`

Registration and login return `{ "token", "user" }`. Game fields use API types `text`, `number`, `select`, and `checkbox`; profile values are keyed by field ID.