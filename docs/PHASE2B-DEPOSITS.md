# Phase 2B — Deposits (ClientZone + Admin)

## You paste SQL first

File: `docs/phase2b-deposits.sql`  
Supabase → SQL Editor → Run

Creates:
- `payment_methods` (+ seed CryptoPay, LemuxionPay)
- extra columns on `transactions`

## Mode

**Mock mode** (default): no real CryptoPay/Lemuxion keys needed.  
Creates PENDING deposit → Admin marks **COMPLETED** → balance increases.

Real PSP adapters come later.

## ClientZone APIs

| Method | Path |
|--------|------|
| GET | `/api/v1/clientzone/payment-methods/config` |
| GET | `/api/v1/clientzone/lead/account/transaction/crypto-pay/supported-coins` |
| POST | `/api/v1/clientzone/lead/account/transaction/crypto-pay` |
| POST | `/api/v1/clientzone/lead/account/transaction/lemuxion-pay` |

## Admin APIs

| Method | Path |
|--------|------|
| GET | `/api/v1/admin/deposits?status=PENDING` |
| PATCH | `/api/v1/admin/deposits/:id/status` body `{ "status": "COMPLETED" }` |

## Webhook stub

`POST /api/v1/webhooks/:provider` (for later real PSPs)

## Test flow (Postman)

1. Client login → get `accountId` from accounts  
2. GET payment-methods/config  
3. POST crypto-pay with accountId + amount + payCurrency  
4. Admin login → GET deposits  
5. PATCH deposit status COMPLETED  
6. Client GET accounts → balance increased  

## Push after SQL

```bash
cd "/d/New Apis Apexaiactionvation plan/crm-platform"
git add .
git commit -m "Phase 2B: deposits ClientZone + Admin (mock PSP)"
git push origin main
```
