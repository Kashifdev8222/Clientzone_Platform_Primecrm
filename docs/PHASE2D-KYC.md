# Phase 2D — KYC documents (ClientZone + Admin)

## 1) Paste SQL

`docs/phase2d-kyc.sql` → Supabase SQL Editor → Run

## 2) Create Storage bucket (required)

Supabase → **Storage** → **New bucket**:

| Setting | Value |
|---------|--------|
| Name | `kyc-documents` |
| Public | **Off** (private) |

## 3) Render env (already should have)

```text
SUPABASE_URL=https://nrtzffzdhmyesodzksbh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

## 4) Push + redeploy

```bash
cd "/d/New Apis Apexaiactionvation plan/crm-platform"
git add .
git commit -m "Phase 2D: KYC documents ClientZone + Admin"
git push origin main
```

## 5) Re-import Postman

- `CRM-ClientZone` → folder **5. KYC**
- `CRM-Admin` → folder **5. KYC**

## APIs

### ClientZone
- `POST /api/v1/clientzone/documents` — multipart: `file` + `document` (JSON string)
- `GET /api/v1/clientzone/documents/all`

### Admin
- `GET /api/v1/admin/documents?status=PENDING`
- `PATCH /api/v1/admin/documents/:id/review` — `{ "status": "APPROVED" }` or `REJECTED`

## document JSON example

```json
{
  "documentType": "Passport",
  "description": "Passport photo page"
}
```

Allowed types (portal): `Passport`, `CardFront`, `ProofOfResidency`, `General`, `IdFront`, `IdBack`, …

Allowed files: jpg, jpeg, png, pdf (max 10MB)
