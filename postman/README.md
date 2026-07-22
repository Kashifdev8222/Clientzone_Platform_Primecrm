# Postman collections

Import **only these two** (delete old mixed collections in Postman):

| File | Side |
|------|------|
| `CRM-ClientZone.postman_collection.json` | Client portal APIs |
| `CRM-Admin.postman_collection.json` | Staff / admin APIs |

## How to use

1. Postman → Import → select both files  
2. Delete any old “Phase 1+2A combined” collection  
3. Run **ClientZone** first (register → login → deposit)  
4. Run **Admin** (login → list deposits → mark COMPLETED)  
5. Back to ClientZone → list accounts (balance updated)

## Tokens

- ClientZone uses `{{clientToken}}` (from client login)  
- Admin uses `{{staffToken}}` (from staff login)  
- They are **different** — never mix them  
