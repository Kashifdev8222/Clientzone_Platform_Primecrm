# Phase 2A — Your steps (Admin + ClientZone passwords)

## Always two API sides

See `docs/API-SURFACES.md`:

- ClientZone → `/api/v1/clientzone/...`
- Admin → `/api/v1/admin/...`

---

## 1) YOU paste SQL in Supabase (required first)

Open file:

`docs/phase2a-admin-staff.sql`

1. Supabase → SQL Editor → New query  
2. Paste full file → **Run**  
3. Confirm tables: `staff_users`, `password_reset_tokens`  
4. Confirm admin row: email `admin@apex.ai`

Default admin login:

- Email: `admin@apex.ai`
- Password: `Admin@12345`  
  (change later)

---

## 2) Developer / you push code + Render env

Add Render env (optional but useful for testing forgot password on free Render):

```text
EXPOSE_RESET_TOKEN=true
```

Without this, forgot-password still works but `resetToken` is hidden in production responses.

Then push `crm-platform` to GitHub and redeploy Render.

Locally before push:

```bash
cd crm-platform
npx prisma generate
npm run build
```

---

## 3) Postman

Import:

`postman/Admin-ClientZone-Phase2A.postman_collection.json`

Test Admin first: **Staff login** → **List clients**.

---

## What this phase adds

### ClientZone
- `POST /auth/forgotpass`
- `POST /auth/resetpass`
- `POST /auth/changepass`

### Admin
- `POST /admin/auth/login`
- `GET /admin/me`
- `GET /admin/clients`
- `GET /admin/clients/:id`
- `GET /admin/accounts`
- `GET /admin/transactions`

---

## Next phases (still both sides)

3. Deposits (client create + admin reconcile + webhooks)  
4. Withdraw (client request + admin approve)  
5. KYC (client upload + admin review)  
6. Tickets (client + admin desk)  
7. Admin panel UI  
