# Phase 2C — Withdraw (ClientZone + Admin)

## 1) Paste SQL first

`docs/phase2c-withdraw.sql` → Supabase SQL Editor → Run

## 2) Push + redeploy

```bash
cd "/d/New Apis Apexaiactionvation plan/crm-platform"
git add .
git commit -m "Phase 2C: withdraw + sources ClientZone and Admin"
git push origin main
```

## 3) Re-import Postman (two collections)

- `postman/CRM-ClientZone.postman_collection.json` → folder **4. Withdraw**
- `postman/CRM-Admin.postman_collection.json` → folder **4. Withdrawals**

## Behavior

| Action | Balance |
|--------|---------|
| Client create withdraw | Deducted immediately (held) |
| Client cancel (PENDING) | Refunded |
| Admin FAILED / CANCELED | Refunded |
| Admin COMPLETED | Stays deducted (paid out) |

## ClientZone paths (PrimeCRM-compatible)

- `POST /api/v1/clientzone/lead/account/transactions` — create withdraw
- `PATCH /api/v1/clientzone/lead/account/transactions/:id` — cancel
- `GET/POST/PATCH/DELETE .../transaction-source/...` — destinations

## Admin paths

- `GET /api/v1/admin/withdrawals`
- `PATCH /api/v1/admin/withdrawals/:id/status`

## Test order

1. Deposit + admin COMPLETED (need balance)
2. Client create source
3. Client create withdraw
4. Admin COMPLETED or client cancel
