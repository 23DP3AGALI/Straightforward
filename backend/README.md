# Straightforward API

Backend uses Node.js, Express, and MySQL 8+ (or a compatible MariaDB release).

## Run locally on Windows

1. Start MySQL and create the database using MySQL Workbench or the command line:

   ```sql
   CREATE DATABASE straightforward CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. From the repository root, apply `database/migrations/001_init.sql` using MySQL Workbench, or from Command Prompt:

   ```cmd
   mysql -u root -p straightforward < database\migrations\001_init.sql
   ```

   If the database already has the application tables and startup reports
   `Unknown column 'password_hash'`, apply the compatibility migration instead:

   ```cmd
   mysql -u root -p straightforward < database\migrations\002_add_password_hash.sql
   ```

   This migration is safe to run again. Existing accounts without a password
   hash cannot log in until they receive a password hash. If no admin exists,
   startup creates the configured admin account once; it sets a password for
   that account if its existing hash is empty. Once an admin exists, startup
   does not create or promote another account or change an existing password.

   If profile creation reports an internal server error because `anketa.updated_at`
   is missing, apply this migration:

   ```cmd
   mysql -u root -p straightforward < database\migrations\003_add_profile_updated_at.sql
   ```

   To enable persistent chats, chat notifications, likes, and matches, apply:

   ```cmd
   mysql -u root -p straightforward < database\migrations\004_create_chat_notifications.sql
   ```

   New messages are saved in MySQL and chats refresh automatically. Chats are
   available to both users after a mutual like. Incoming likes and messages are
   shown on the Notifications page.

3. In `backend`, create the local environment file:

   ```powershell
   notepad .env
   ```

   Add these settings with your own MySQL password and administrator credentials:

   ```env
   PORT=3000
   DATABASE_URL=mysql://root:your-password@localhost:3306/straightforward
   JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
   FRONTEND_ORIGIN=http://localhost:5173
   ADMIN_EMAIL=admin@example.com
   ADMIN_NICK=admin
   ADMIN_PASSWORD=change-this-password
   ```

   Generate a random secret with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

4. In a terminal opened in `backend`, install dependencies and start the API:

   ```powershell
   npm install
   npm run dev
   ```

   The API listens on `http://localhost:3000`; check `GET /api/health`.

5. In a second terminal opened in `frontend`, run:

   ```powershell
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. Vite forwards `/api` requests to the backend.
   Sign in with the administrator credentials from `.env`, open `/admin`, and add games before users create profiles.

## Routes

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/games`, `GET /api/games/:id`; admins can create, edit, and delete games at `/api/games`
- `GET /api/games/:gameId/profiles`, `GET|PUT|DELETE /api/games/:gameId/profiles/me`
- `POST /api/games/:gameId/profiles/:profileId/reactions` with `{ "type": "like" | "dislike" }`
- `POST /api/games/:gameId/profiles/:profileId/reports` with `{ "reason": "..." }`
- Admin moderation: `GET /api/admin/reports`, `POST /api/admin/reports/:reportId/review`, and ban/lift-ban routes under `/api/admin/users/:userId/bans`

Registration and login return `{ "token", "user" }`. Game fields use API types
`text`, `number`, `select`, and `checkbox`; profile values are keyed by field ID.
