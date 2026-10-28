# Straightforward

Platform to find your best duo, trio or team! / Platforma, lai atrastu duo, trio vai pilnu komandu!

**Straightforward** ir tīmekļa platforma spēlētājiem, kas meklē komandas biedrus. Lietotājs izvēlas spēli, izveido savu spēlētāja anketu, pārlūko citu anketas, izsaka simpātijas, sarakstās ar savstarpēji piemērotiem spēlētājiem un veido komandu telpas (lobby).

## Satura rādītājs

- [Funkcionalitāte](#funkcionalitāte)
- [Tehnoloģijas](#tehnoloģijas)
- [Projekta struktūra](#projekta-struktūra)
- [Prasības](#prasības)
- [Ātrā palaišana](#ātrā-palaišana)
- [Vides mainīgie (.env)](#vides-mainīgie-env)
- [Datubāzes migrācijas](#datubāzes-migrācijas)
- [Spēļu katalogs (seed)](#spēļu-katalogs-seed)
- [Produkcijas izvietošana](#produkcijas-izvietošana)
- [API maršruti](#api-maršruti)
- [Dokumentācija](#dokumentācija)
- [Problēmu risināšana](#problēmu-risināšana)

## Funkcionalitāte

- Reģistrācija ar e-pasta verifikāciju (kods derīgs 10 minūtes, atkārtota nosūtīšana reizi minūtē, 5 mēģinājumi) un pieteikšanās.
- Vecuma validācija: 12–99 gadi.
- Spēļu katalogs ar kategorijām un attēliem; vienspēlētāja spēles tiek paslēptas no meklēšanas.
- Spēles anketa: apraksts (līdz 600 rakstzīmēm) un spēlei specifiski lauki (`text`, `number`, `select`, `checkbox`, katra vērtība līdz 200 rakstzīmēm).
- Spēlētāju meklēšana, Like / Dislike, izlase un skatīto spēlētāju vēsture.
- Čats pēc savstarpējas simpātijas (mutual like), ziņas tiek saglabātas datubāzē, čats atjaunojas automātiski.
- Paziņojumi par jaunām simpātijām un ziņām.
- Komandu telpas (lobby): izveide, pievienošanās, iziešana, aizvēršana un grupas čats.
- Konta iestatījumi: avatars, vecums.
- Sūdzības par spēlētājiem un administratora moderācija (sūdzību izskatīšana, bloķēšana, bloķējumu vēsture).
- Administratora panelis spēļu un lauku pārvaldībai.

## Tehnoloģijas

| Slānis | Tehnoloģija |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js, Express |
| Datubāze | MySQL 8+ (vai saderīga MariaDB) |
| Autentifikācija | JWT |
| E-pasts | SMTP (verifikācijas kodi) |
| Izvietošana | Vercel (frontend), Render (backend) |

## Projekta struktūra

```
Straightforward/
├── backend/                  # Node.js / Express API
├── frontend/                 # React lietotāja saskarne
├── database/migrations/      # SQL migrācijas (001–011)
├── docs/                     # Papildu dokumentācija
├── datubaze diagrammas.drawio  # Datubāzes / ER diagrammas
├── dokumentacija_grupassdarbs.pdf
├── straightforward_dokumentacija.pdf
├── Terms of Service EN.pdf
├── start.bat                 # Palaišanas skripts (Windows)
├── commit.bat                # Palīgskripts commit veikšanai (Windows)
└── README.md
```

## Prasības

- [Node.js](https://nodejs.org/) un npm
- MySQL 8+ (vai saderīga MariaDB)
- SMTP konts verifikācijas e-pastu sūtīšanai
- Windows (palaišanas komandas zemāk dotas Windows videi)

## Ātrā palaišana

### 1. Datubāze

```sql
CREATE DATABASE straightforward CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Piemēro migrācijas no repozitorija saknes (skatiet [Datubāzes migrācijas](#datubāzes-migrācijas)):

```
mysql -u root -p straightforward < database\migrations\001_init.sql
```

### 2. Backend

Mapē `backend` izveido failu `.env` (skatiet [Vides mainīgie](#vides-mainīgie-env)) un palaid serveri:

```
cd backend
npm install
npm run dev
```

API darbojas adresē `http://localhost:3000`. Pārbaude: `GET /api/health`.

Pēc pirmās palaišanas aizpildi spēļu katalogu:

```
npm run seed:games
```

### 3. Frontend

Otrā terminālī:

```
cd frontend
npm install
npm run dev
```

Atver `http://localhost:5173`. Vite pārsūta `/api` pieprasījumus uz backend. Piesakies ar administratora datiem no `.env`, atver `/admin` un pievieno spēles.

## Vides mainīgie (.env)

Fails `backend/.env`:

```
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

| Mainīgais | Apraksts |
|---|---|
| `PORT` | Backend ports |
| `DATABASE_URL` | MySQL savienojuma virkne |
| `JWT_SECRET` | Nejaušs noslēpums vismaz 32 rakstzīmes |
| `FRONTEND_ORIGIN` | Atļautie frontend origin (ar komatiem atdalīti) |
| `SMTP_*` | SMTP iestatījumi e-pasta verifikācijai. Ports 465 izmanto TLS automātiski; citiem portiem, ja nepieciešams, `SMTP_SECURE=true` |
| `ADMIN_*` | Sākotnējā administratora konta dati |

Nejaušu noslēpumu var ģenerēt ar:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Svarīgi:** nekad neiekļaujiet `.env` failu repozitorijā.

## Datubāzes migrācijas

Migrācijas atrodas `database/migrations` un jāpiemēro secīgā kārtībā:

| Fails | Mērķis |
|---|---|
| `001_init.sql` | Pamata tabulas |
| `002_add_password_hash.sql` | Saderības migrācija (kļūda `Unknown column 'password_hash'`) |
| `003_add_profile_updated_at.sql` | `anketa.updated_at` |
| `004_create_chat_notifications.sql` | Čati, paziņojumi, like un match |
| `005_team_finding_features.sql` | Preferences, saglabātie spēlētāji, lobby, aktivitāte |
| `006_team_lobby_chat.sql` | Lobby grupas čats |
| `007_user_profile_settings.sql` | Konta avatari |
| `008_email_verification.sql` | E-pasta verifikācija |
| `009_add_game_categories.sql` | Spēļu kategorijas |
| `010_multiplayer_demo_profiles.sql` | Vienspēlētāja spēles un demo konti |
| `011_age_and_admin_profile_tools.sql` | Vecums un admin moderācijas rīki |

Piemērs:

```
mysql -u root -p straightforward < database\migrations\004_create_chat_notifications.sql
```

## Spēļu katalogs (seed)

```
cd backend
npm run seed:games
```

Skripts ir droši atkārtojams: pievieno trūkstošās spēles un laukus, atjauno kategorijas, aizpilda trūkstošos attēlus, neaizvietojot pielāgotos. Tas paslēpj vienspēlētāja spēles no meklēšanas un katrai multiplayer spēlei izveido 20 skaidri marķētus demo profilus (rezervēti `.invalid` e-pasti, nejauši paroles). Administratori demo profilus var rediģēt lietotāju moderācijā.

## Produkcijas izvietošana

- **Render (backend):** iestati `FRONTEND_ORIGIN` uz atļautajiem frontend origin (ar komatiem atdalītus).
- **Vercel (frontend):** iestati `VITE_API_URL` uz backend API adresi, piemēram `https://<backend>.onrender.com/api`. Neiekļauj resursu ceļu (piem. `/games`). Pēc maiņas pārbūvē (redeploy) projektu.
- `frontend/vercel.json` pārsūta `/api/*` uz Render, ja `VITE_API_URL` build laikā nav iestatīts.
- Vite proxy uz `http://localhost:3000` tiek izmantots tikai izstrādes serverī.

## API maršruti

**Autentifikācija**

- `POST /api/auth/register`, `POST /api/auth/verify-registration`, `POST /api/auth/resend-registration-code`, `POST /api/auth/login`
- `GET /api/auth/me`, `PATCH /api/auth/me`

**Spēles un anketas**

- `GET /api/games`, `GET /api/games/:id` (administratori: izveide, rediģēšana, dzēšana)
- `GET /api/games/:gameId/profiles`
- `GET|PUT|DELETE /api/games/:gameId/profiles/me`
- `GET /api/profiles/favorites`, `PUT|DELETE /api/profiles/favorites/:profileId`, `GET /api/profiles/history`
- `POST /api/games/:gameId/profiles/:profileId/reactions` — `{ "type": "like" | "dislike" }`
- `POST /api/games/:gameId/profiles/:profileId/reports` — `{ "reason": "..." }`

**Komandu telpas**

- `GET|POST /api/games/:gameId/lobbies` un pievienošanās, iziešana, aizvēršana zem `/api/games/:gameId/lobbies/:lobbyId`
- `GET|POST /api/lobbies/:lobbyId/messages` — grupas čats (tikai atvērtas telpas dalībniekiem)
- `GET /api/lobbies/mine`

**Administrators**

- `GET /api/admin/reports`, `POST /api/admin/reports/:reportId/review`
- Bloķēšana un atcelšana: `/api/admin/users/:userId/bans`
- `GET /api/admin/bans` — bloķējumu vēsture

Reģistrācija un pieteikšanās atgriež `{ "token", "user" }`.

## Dokumentācija

- [`straightforward_dokumentacija.pdf`](straightforward_dokumentacija.pdf) — projekta dokumentācija
- [`dokumentacija_grupassdarbs.pdf`](dokumentacija_grupassdarbs.pdf) — grupas darba dokumentācija
- [`datubaze diagrammas.drawio`](datubaze%20diagrammas.drawio) — datubāzes diagrammas
- [`Terms of Service EN.pdf`](Terms%20of%20Service%20EN.pdf) — lietošanas noteikumi
- [`backend/README.md`](backend/README.md) — detalizēta backend palaišanas instrukcija

## Problēmu risināšana

| Problēma | Risinājums |
|---|---|
| `Unknown column 'password_hash'` | Piemēro `002_add_password_hash.sql` |
| Kļūda veidojot anketu (`updated_at`) | Piemēro `003_add_profile_updated_at.sql` |
| Nenāk verifikācijas e-pasts | Pārbaudi `SMTP_*` iestatījumus un mēstuļu mapi |
| CORS kļūda | Pārbaudi `FRONTEND_ORIGIN` backend `.env` |
| Tukšs spēļu katalogs | Palaid `npm run seed:games` vai pievieno spēles `/admin` |
| Frontend nesasniedz API produkcijā | Pārbaudi `VITE_API_URL` un pārbūvē Vercel projektu |

## Autori

Komanda **23DP3AGALI**.
