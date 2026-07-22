# Clientzone Platform PrimeCRM API

Multi-tenant CRM API (NestJS + Supabase) that replaces PrimeCRM Client Zone endpoints for Apex AI and future brands.

## Stack

- NestJS (TypeScript)
- Prisma + Supabase Postgres
- JWT auth (Client Zone Bearer token)
- Deploy on Render

## Local setup

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`

## Phase 1 endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | none |
| POST | `/api/v1/clientzone/leads` | none |
| POST | `/api/v1/clientzone/auth/login` | none |
| GET | `/api/v1/clientzone/lead/accounts` | Bearer |
| PATCH | `/api/v1/clientzone/lead/accounts/:id/name` | Bearer |
| GET | `/api/v1/clientzone/lead/account/transactions` | Bearer |

### Register (Git Bash / Linux / macOS)

```bash
curl -X POST http://localhost:3000/api/v1/clientzone/leads \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"secret123","phone":"+923001234567"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/clientzone/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'
```

Use `data.accessToken` as:

`Authorization: Bearer <token>`

## Render deploy settings

| Setting | Value |
|---------|--------|
| Runtime | Node |
| Build Command | `npm install --include=dev && npx prisma generate && npm run build` |
| Start Command | `npx prisma migrate deploy && npm run start:prod` |
| Root Directory | *(leave empty if repo root is this API)* |

> Note: production entry file is `dist/main.js` (Nest build output).

### Required env vars on Render

```text
NODE_ENV=production
JWT_SECRET=your-long-random-secret
DEFAULT_TENANT_SLUG=apex-ai
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

After deploy, test: `https://YOUR-SERVICE.onrender.com/health`

## Point ClientZone at this API

In portal `api/config.php`:

```php
'BASE_URL' => 'https://YOUR-SERVICE.onrender.com/api/v1',
```

## Notes

- Do not commit `.env`
- ClientZone PHP portal stays separate; only `BASE_URL` changes
- RLS on Supabase tables can be enabled later (NestJS uses direct DB connection)
