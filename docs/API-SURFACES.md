# API Surfaces — ALWAYS two sides

Every feature must expose (or clearly skip) both sides:

| Side | Base path | Who uses it |
|------|-----------|-------------|
| **ClientZone** | `/api/v1/clientzone/...` | Client portal (PHP / Postman / mobile) |
| **Admin** | `/api/v1/admin/...` | Admin panel / staff / agents |

```
ClientZone UI ──► /api/v1/clientzone/* ──► NestJS ──► Supabase
Admin panel   ──► /api/v1/admin/*       ──► NestJS ──► Supabase
```

## Rules

1. Never mix client and staff tokens.
   - Client JWT: `{ type: "client", sub, email, tenantId }`
   - Staff JWT: `{ type: "staff", sub, email, tenantId, role }`
2. ClientZone routes only return **that client’s** data.
3. Admin routes can list/manage all clients in a tenant (by role).
4. New DB tables → write SQL under `docs/` for human paste (do not auto-apply from agent).
5. Payments / KYC / tickets always get **both** client + admin endpoints when built.

## Current endpoints

### ClientZone

| Method | Path | Auth |
|--------|------|------|
| POST | `/clientzone/leads` | none |
| POST | `/clientzone/auth/login` | none |
| POST | `/clientzone/auth/forgotpass` | none |
| POST | `/clientzone/auth/resetpass` | none |
| POST | `/clientzone/auth/changepass` | Bearer client |
| GET | `/clientzone/lead/accounts` | Bearer client |
| PATCH | `/clientzone/lead/accounts/:id/name` | Bearer client |
| GET | `/clientzone/lead/account/transactions` | Bearer client |

### Admin

| Method | Path | Auth |
|--------|------|------|
| POST | `/admin/auth/login` | none |
| GET | `/admin/clients` | Bearer staff |
| GET | `/admin/clients/:id` | Bearer staff |
| GET | `/admin/accounts` | Bearer staff |
| GET | `/admin/transactions` | Bearer staff |
| GET | `/admin/me` | Bearer staff |

## Build order (full CRM)

1. Auth (client + admin) ← now expanding
2. Accounts / transactions read
3. Deposits + webhooks (client create, admin reconcile)
4. Withdraw + sources (client request, admin approve)
5. KYC documents (client upload, admin review)
6. Tickets + meetings (client + admin desk)
7. Admin panel UI (Next.js)
