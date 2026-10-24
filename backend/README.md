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

   To add teammate preferences, saved-player history, team lobbies, and game
   activity counts, apply this migration once after the previous migrations:

   ```cmd
   mysql -u root -p straightforward < database\migrations\005_team_finding_features.sql
   ```

   To enable the group chat inside each team lobby, apply:

   ```cmd
   mysql -u root -p straightforward < database\migrations\006_team_lobby_chat.sql
   ```

   To enable account avatars, apply:

   ```cmd
   mysql -u root -p straightforward < database\migrations\007_user_profile_settings.sql
   ```

   To enable email verification during registration, apply:

   ```cmd
   mysql -u root -p straightforward < database\migrations\008_email_verification.sql
   ```

   To add game categories, apply:

   ```cmd
   mysql -u root -p straightforward < database\migrations\009_add_game_categories.sql
   ```

   To mark single-player games and generated demo accounts, apply:

   ```cmd
   mysql -u root -p straightforward < database\migrations\010_multiplayer_demo_profiles.sql
   ```

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
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   SMTP_FROM=StraightForward <no-reply@example.com>
   ADMIN_EMAIL=admin@example.com
   ADMIN_NICK=admin
   ADMIN_PASSWORD=change-this-password
   ```

   Generate a random secret with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   Registration email verification requires valid SMTP credentials. Use the SMTP
   host, port, username, and app-specific password/API credential provided by
   your email provider. Port 465 uses TLS automatically; set `SMTP_SECURE=true`
   when your provider requires TLS on another port. The verification code expires
   after 10 minutes, can be resent once per minute, and allows five attempts.

4. In a terminal opened in `backend`, install dependencies and start the API:

   ```powershell
   npm install
   npm run dev
   ```

   The API listens on `http://localhost:3000`; check `GET /api/health`.

   After the API starts and creates the bootstrap administrator, populate the
   catalog with multiplayer games, category artwork, and game-specific profile fields:

   ```powershell
   npm run seed:games
   ```

   The seed is safe to rerun: it adds missing games and fields, updates
   categories, and fills missing game images without replacing custom images
   or fields. It marks single-player titles as hidden from game search and
   creates 20 clearly labeled demo profiles per multiplayer game. Demo accounts
   use reserved `.invalid` email addresses and random, undisclosed passwords.
   Administrators can find and edit these records in user moderation; rerunning
   the seed preserves edited demo nicknames, avatars, profile descriptions, and
   existing field values.

   Apply migration `011_age_and_admin_profile_tools.sql` before deploying the
   age-validated registration and admin user/profile moderation updates:

   ```powershell
   mysql -u root -p straightforward < ..\database\migrations\011_age_and_admin_profile_tools.sql
   ```

   New accounts must provide an age from 12 through 99. Existing users can set
   their age in account settings; the same range is enforced by the API.

5. In a second terminal opened in `frontend`, run:

   ```powershell
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. Vite forwards `/api` requests to the backend.
   Sign in with the administrator credentials from `.env`, open `/admin`, and add games before users create profiles.

## Production deployment

- Set `FRONTEND_ORIGIN` on Render to the comma-separated frontend origins that
  should be allowed, for example:
  `https://straightforward-3ht2-v6zpx-dp3fomes-projects.vercel.app`.
- Set `VITE_API_URL` in the Vercel project to
  `https://straightforward-d98r.onrender.com/api`. API paths such as `/games`
  are appended by the shared frontend API client; do not include a resource
  path such as `/games` in `VITE_API_URL`. Redeploy Vercel after changing this
  build-time variable.
- The Vercel rewrite in `frontend/vercel.json` forwards `/api/*` to Render as
  a fallback when `VITE_API_URL` is not set during the frontend build.
- The Vite proxy to `http://localhost:3000` is used only by the development
  server.

## Routes

- `POST /api/auth/register`, `POST /api/auth/verify-registration`, `POST /api/auth/resend-registration-code`, `POST /api/auth/login`, `GET /api/auth/me`, and `PATCH /api/auth/me` for account settings
- `GET /api/games`, `GET /api/games/:id`; admins can create, edit, and delete games at `/api/games`
- `GET /api/games/:gameId/profiles`, `GET|PUT|DELETE /api/games/:gameId/profiles/me`
- `GET /api/profiles/favorites`, `PUT|DELETE /api/profiles/favorites/:profileId`, and `GET /api/profiles/history`
- `GET|POST /api/games/:gameId/lobbies`, plus join, leave, and owner-close operations under `/api/games/:gameId/lobbies/:lobbyId`
- `GET|POST /api/lobbies/:lobbyId/messages` for a group chat available only to current members of an open lobby
- `GET /api/lobbies/mine` for the current user's open joined groups
- `POST /api/games/:gameId/profiles/:profileId/reactions` with `{ "type": "like" | "dislike" }`
- `POST /api/games/:gameId/profiles/:profileId/reports` with `{ "reason": "..." }`
- Admin moderation: `GET /api/admin/reports`, `POST /api/admin/reports/:reportId/review`, and ban/lift-ban routes under `/api/admin/users/:userId/bans`
- Admin moderation history: `GET /api/admin/bans` lists recent bans and their active/lifted status

Registration and login return `{ "token", "user" }`. Game fields use API types
`text`, `number`, `select`, and `checkbox`; profile values are keyed by field ID.
Each game-specific profile contains a description and values for that game's
administrator-configured fields. Individual field values are limited to 200
characters; the profile description is limited to 600 characters.
