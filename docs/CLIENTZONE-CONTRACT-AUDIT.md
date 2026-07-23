# ClientZone API contract audit (vs PrimeCRM + portal)

## Register — status after this update

### Your PrimeCRM body (Postman) vs our API

| Field | PrimeCRM | Our API now | Notes |
|-------|----------|-------------|--------|
| firstName / lastName | yes | yes | also accepts `fullName` (portal) |
| email / phone / password | yes | yes | required |
| country | yes | yes | default `PK` |
| language | yes | yes | default `bm` |
| customFields | yes | yes | stored as text |
| username | yes | yes | default = email |
| birthDate | yes | yes | accepts odd `2023-12-12:12:12Z` |
| accounts[] | yes | yes | creates one row per item |
| brandId | yes | yes | must match tenant if sent |
| businessUnitId | yes | yes | must match tenant if sent |
| isDemoAccount | yes | yes | accepts `"true"` string |
| tags[] | yes | yes | stored JSON |
| notes[] | yes | yes | stored JSON |
| Authorization Bearer | your sample has it | **not required** | Portal uses **no auth** for self-register. We keep public register (like portal). |

### You must paste SQL first

`docs/phase2a1-client-register-fields.sql`

---

## Auth difference to know

| Call | PrimeCRM sample | Our platform | Portal PHP |
|------|-----------------|--------------|------------|
| POST leads | Bearer in your curl | **No bearer required** | `authMode: none` |

If you later need **agent-created leads** (staff token required), we add Admin endpoint:
`POST /api/v1/admin/clients` — separate from ClientZone public register.

---

## Phase 1 + 2A — what matches / missing

### Done & aligned enough for portal auth/accounts

| Endpoint | Match level |
|----------|-------------|
| POST `/clientzone/leads` | **Aligned** after this update (request body) |
| POST `/clientzone/auth/login` | Works; need PrimeCRM **response JSON** to match field names 100% |
| POST forgot/reset/changepass | Paths match; email sending not wired yet |
| GET accounts | Works; need sample response for exact fields |
| PATCH account name | Works |
| GET transactions | Works (empty until money APIs) |

### Still missing (cannot switch live ClientZone yet)

- payment-methods/config  
- crypto-pay / lemuxion-pay / supported-coins  
- withdraw create/cancel + transaction-source CRUD  
- documents upload/list (KYC)  
- tickets + comments + departments ✅ (Phase 2E)
- meetings + time-slots ✅ (Phase 2E)

---

## Please send from Postman (PrimeCRM) — next accuracy pass

Paste **response JSON only** (redact tokens) for:

1. `POST clientzone/leads` — **success response**
2. `POST clientzone/auth/login` — **success response**
3. `GET clientzone/lead/accounts` — **success response**
4. `GET clientzone/lead/account/transactions` — sample with 1 deposit if possible
5. `GET clientzone/payment-methods/config` — when we start deposits

With those, we make response shapes match so PHP portal needs only `BASE_URL` change.
