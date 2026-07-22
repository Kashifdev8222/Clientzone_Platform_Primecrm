# CRM Platform API (NestJS + Supabase)

Multi-tenant CRM API that replaces PrimeCRM Client Zone endpoints for Apex AI (and future brands).

## Stack

- NestJS (TypeScript)
- Prisma + Supabase Postgres
- JWT auth (Client Zone Bearer)
- Ready for Render deploy

## Folder

This lives in `crm-platform/` (separate from the PHP ClientZone portal).

## Setup

```bash
cd crm-platform
cp .env.example .env   # or use existing .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

API: `http://localhost:3000`  
Health: `http://localhost:3000/health`

## Phase 1 endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | none |
| POST | `/api/v1/clientzone/leads` | none |
| POST | `/api/v1/clientzone/auth/login` | none |
| GET | `/api/v1/clientzone/lead/accounts` | Bearer |
| PATCH | `/api/v1/clientzone/lead/accounts/:id/name` | Bearer |
| GET | `/api/v1/clientzone/lead/account/transactions` | Bearer |

### Register

```bash
curl -X POST http://localhost:3000/api/v1/clientzone/leads ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"secret123\",\"phone\":\"+923001234567\"}"
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/clientzone/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"secret123\"}"
```

Use `data.accessToken` as `Authorization: Bearer <token>` for accounts/transactions.

## Point ClientZone at this API later

In portal `api/config.php`:

```php
'BASE_URL' => 'http://localhost:3000/api/v1',
// later: 'https://YOUR-SERVICE.onrender.com/api/v1',
```

## Render (later)

1. New Web Service from this folder / GitHub repo
2. Build: `npm install && npx prisma generate && npm run build`
3. Start: `npx prisma migrate deploy && npm run start:prod`
4. Set env vars from `.env.example`
