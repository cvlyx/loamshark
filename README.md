**Loan-Shark-Hub**

- **Description:** Full-stack P2P lending demo app (Expo + Express + PostgreSQL). Users can register/login, request loans, approve/decline requests, and make payments. Mobile app built with Expo (React Native). Backend is an Express TypeScript server using Drizzle ORM and PostgreSQL for persistence.

**Quick Links**
- **Backend route handlers:** [server/routes.ts](server/routes.ts)
- **Frontend API client:** [lib/query-client.ts](lib/query-client.ts)
- **Schema & models:** [shared/schema.ts](shared/schema.ts)
- **Expo app entry:** [app/index.tsx](app/index.tsx)
- **Tab layout (UI):** [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx)
- **DB schema (SQL):** [neon-schema.sql](neon-schema.sql)

**Features**
- User registration & login (session-based)
- Lender / borrower roles with wallet balances
- Create, approve, decline, and repay loans
- Payment records and loan status tracking
- Expo mobile + web frontends with React Query
- Local development with PostgreSQL and Drizzle ORM

**Tech Stack**
- Frontend: Expo (React Native), Expo Router, React Query
- Backend: Node.js, Express 5 (TypeScript), Drizzle ORM, Zod validation
- Database: PostgreSQL (local or cloud)
- Build: EAS (Expo Application Services) for APK builds

**Prerequisites**
- Node.js >= 18 and npm
- PostgreSQL 14+ (local install) or a reachable cloud Postgres
- Yarn or npm
- Expo CLI / EAS CLI (optional for builds)
- Android Studio + Android SDK (only required to run or install with `adb` locally)

**Environment variables**
Create a `.env` file or set these in your shell / CI:
- `DATABASE_URL` - Postgres connection string (example: `postgres://postgres:password@localhost:5432/heliumdb`)
- `SESSION_SECRET` - random secret for sessions
- `NODE_ENV` - `development` or `production`
- `EXPO_PUBLIC_DOMAIN` - host:port your backend is reachable at (e.g. `192.168.149.203:5000` for local LAN)

**Local setup (backend + database)**
1. Create Postgres database and user (example):
```bash
psql -U postgres -c "CREATE DATABASE heliumdb;"
```
2. Load the schema:
```bash
psql -U postgres -d heliumdb -f neon-schema.sql
```
3. Install dependencies and build the server
```bash
npm install
npm run build # if using TS build step
npm run start:dev # or `npm run dev` depending on scripts
```
4. Confirm backend listening on port 5000 (default):
```powershell
netstat -ano | findstr :5000
```

**Local setup (frontend / Expo)**
1. Install Expo & dependencies:
```bash
npm install -g expo-cli eas-cli
npm install
```
2. Start Expo (web + mobile dev server):
```powershell
$env:EXPO_PUBLIC_DOMAIN='192.168.149.203:5000'; npx expo start --localhost false
```
- For web: open the provided localhost URL (usually `http://localhost:8084`).
- For mobile: scan the QR code with Expo Go or use `exp://192.168.149.203:8084`.

**Testing auth & API**
- Register: POST `/api/auth/register`
- Login: POST `/api/auth/login`
- Protected endpoints use session cookie; ensure fetch includes credentials in the frontend (configured in `lib/query-client.ts`).

**Building an APK (EAS / Expo)**
1. Configure EAS for your project (you can run through the interactive flow or use the provided `eas.json`):
```powershell
npm install -g eas-cli
eas build:configure
```
2. Build on Expo cloud (recommended) or locally:
```powershell
eas build --platform android
```
- After build completes, EAS gives a download link to a signed APK (example build artifact URL will be printed).

3. Download APK via PowerShell:
```powershell
Invoke-WebRequest -Uri "<apk_url_from_eas>" -OutFile .\app.apk
```
4. Install APK to a connected Android device via `adb`:
```powershell
adb install -r .\app.apk
```
- If `adb` is missing: install Android Studio and add `platform-tools` to PATH.

**Notes about production / networking**
- When running an APK on a device outside your LAN, your backend must be reachable from the device (use a public DNS or tunnelling service like ngrok), or host the backend in a cloud environment.
- `EXPO_PUBLIC_DOMAIN` should point to the externally reachable backend URL for production builds.

**Troubleshooting**
- ERR_SSL_PROTOCOL_ERROR on requests to LAN IP: ensure `lib/query-client.ts` `getApiUrl()` returns `http://` for private IP ranges (localhost, 127.0.0.1, 10.*, 172.*, 192.168.*) in development.
- `spawn adb ENOENT`: ensure Android SDK `platform-tools` is installed and `adb` is on PATH.
- `eas build:configure` login issues: run `eas login` or log in via the browser at https://expo.dev and try again. Use Google OAuth via the web if `eas login --method google` fails.

**Security & Production**
- Use strong `SESSION_SECRET` and HTTPS in production.
- Use managed keystore via EAS or provide your own signing credentials for Play Store releases.
- Move DB to a managed cloud Postgres for production and use proper backups.

**Developer notes (quick)**
- Code entrypoints:
  - Backend server: [server/index.ts](server/index.ts)
  - API routes: [server/routes.ts](server/routes.ts)
  - Frontend: [app/index.tsx](app/index.tsx) and router under [app/](app/)
  - Query client: [lib/query-client.ts](lib/query-client.ts)
- Database schema: [shared/schema.ts](shared/schema.ts) defines Drizzle tables and Zod schemas.

**Useful commands**
```bash
# start backend (dev)
npm run start:dev
# start expo
npx expo start --clear
# build APK via EAS
eas build --platform android
```

**Acknowledgements & Contacts**
- Built as the Loan-Shark-Hub demo project.
- For questions or help running the system, open an issue or contact the maintainer.
