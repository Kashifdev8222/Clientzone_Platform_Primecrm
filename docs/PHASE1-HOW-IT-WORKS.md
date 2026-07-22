# Phase 1 — How it works + where data goes

## Flow (simple)

```
Postman / ClientZone
        │
        ▼
NestJS API on Render
https://clientzone-platform-primecrm.onrender.com
        │
        ▼
Supabase Postgres tables
```

Phase 1 only does: **register → login → list/rename accounts → list transactions**.

---

## Where register data goes

When you call:

`POST /api/v1/clientzone/leads`

NestJS writes to **3 places**:

| Table | What is saved |
|-------|----------------|
| **`tenants`** | Already seeded once (`apex-ai`). Register does **not** create a new tenant. |
| **`clients`** | New user: email, password hash, name, phone, `tenant_id` |
| **`trading_accounts`** | New “Main Account” for that client (balance 0) |

Login does **not** insert rows. It reads `clients`, checks password, returns JWT (`accessToken`).

Accounts / transactions endpoints **read** from:

| Endpoint | Table(s) |
|----------|----------|
| `GET .../lead/accounts` | `trading_accounts` |
| `PATCH .../accounts/:id/name` | updates `trading_accounts.name` |
| `GET .../account/transactions` | `transactions` (empty until deposits/withdraws exist) |

### How to see register data in Supabase

1. Supabase → **Table Editor**
2. Open **`clients`** → your Postman user email should be there
3. Open **`trading_accounts`** → matching `client_id`
4. Open **`tenants`** → one row `apex-ai`

---

## Phase 1 endpoints map

| Step | API | DB action |
|------|-----|-----------|
| 1 | `GET /health` | none |
| 2 | `POST /api/v1/clientzone/leads` | INSERT `clients` + `trading_accounts` |
| 3 | `POST /api/v1/clientzone/auth/login` | READ `clients` → JWT |
| 4 | `GET /api/v1/clientzone/lead/accounts` | READ `trading_accounts` |
| 5 | `GET /api/v1/clientzone/lead/account/transactions` | READ `transactions` |
| 6 | `PATCH .../accounts/:id/name` | UPDATE `trading_accounts` |

---

## UNRESTRICTED — what it means + how you fix it

**UNRESTRICTED** = Row Level Security (**RLS**) is **OFF**.

Supabase shows that when tables are open to the auto Data API if someone had the anon key.

### Fix (you paste yourself — agent will not run this)

File:

`crm-platform/docs/supabase-rls-phase1.sql`

Steps:

1. Open Supabase → **SQL Editor** → New query  
2. Paste the full contents of that file  
3. Click **Run**  
4. Refresh Table Editor → red **UNRESTRICTED** should go away / RLS enabled  

NestJS on Render will **still work** (it uses `DATABASE_URL`, not anon key).

Then re-test Postman login + accounts once.

---

## Rule for future DB changes

From now on:

- Agent will **not** create/alter tables directly on Supabase unless you ask  
- Agent will write a **`.sql` file** under `crm-platform/docs/`  
- You paste/run it yourself in Supabase SQL Editor  
- Prisma migrations stay in `prisma/migrations/` for the NestJS app — you can apply those yourself too if preferred  

---

## Next after Postman + RLS

1. Confirm `clients` / `trading_accounts` rows in Table Editor  
2. Run RLS SQL file yourself  
3. Re-test Postman  
4. Then point ClientZone `BASE_URL` to Render (staging only)
