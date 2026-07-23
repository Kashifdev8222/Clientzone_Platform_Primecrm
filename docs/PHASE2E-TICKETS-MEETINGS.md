# Phase 2E — Tickets + Meetings (ClientZone + Admin)

## 1) Paste SQL

`docs/phase2e-tickets-meetings.sql` → Supabase SQL Editor → Run

This creates:
- `ticket_departments`
- `tickets`
- `ticket_comments`
- `meetings`

And seeds default departments for tenant `apex-ai`: Support, Finance, Verification, Accounts.

## 2) Push + redeploy

```bash
cd "/d/New Apis Apexaiactionvation plan/crm-platform"
git add .
git commit -m "Phase 2E: tickets + meetings ClientZone + Admin"
git push origin main
```

## 3) Re-import Postman

- `CRM-ClientZone` → folder **6. Support (Tickets + Meetings)**
- `CRM-Admin` → folder **6. Support**

## ClientZone APIs

| Method | Path |
|--------|------|
| GET | `/api/v1/clientzone/lead/ticket/department` |
| POST | `/api/v1/clientzone/lead/ticket` |
| GET | `/api/v1/clientzone/lead/ticket/user` |
| GET | `/api/v1/clientzone/lead/ticket/:id` |
| PATCH | `/api/v1/clientzone/lead/ticket/:id` — `{ "status": "Closed" }` |
| POST | `/api/v1/clientzone/lead/ticket-comment` |
| POST | `/api/v1/clientzone/call-meeting-appointment` |
| GET | `/api/v1/clientzone/call-meeting-appointment/user` |
| PATCH | `/api/v1/clientzone/call-meeting-appointment/:id` |
| DELETE | `/api/v1/clientzone/call-meeting-appointment/:id` (cancels) |
| GET | `/api/v1/clientzone/call-meeting-appointment/agent/time-slots/:date/:duration` |

### Create ticket body (portal / PrimeCRM shape)

```json
{
  "category": "Other",
  "departmentId": "<uuid from departments list>",
  "title": "Need help",
  "userId": "<ignored — taken from JWT>",
  "userTicketComments": [
    { "text": "Hello, I need support with…", "userId": "<ignored>" }
  ]
}
```

### Create meeting body

```json
{
  "title": "Call with agent",
  "description": "Discuss account setup",
  "date": "2026-07-25T10:00:00.000Z",
  "meetingPeriod": 30,
  "importance": "normal",
  "isUserConfirmed": true
}
```

### Time slots

Path date may be `2026-7-25` (no leading zeros) or `2026-07-25`.  
Duration: `30` or `60`.  
Response items: `{ "key": "09:00 - 09:30", "value": "09:00 - 09:30", "isDisabled": false }`

## Admin APIs

| Method | Path |
|--------|------|
| GET / POST | `/api/v1/admin/departments` |
| PATCH | `/api/v1/admin/departments/:id` |
| GET | `/api/v1/admin/tickets?status=New` |
| GET / PATCH | `/api/v1/admin/tickets/:id` |
| POST | `/api/v1/admin/tickets/:id/comments` — staff reply |
| GET | `/api/v1/admin/meetings?status=scheduled` |
| PATCH | `/api/v1/admin/meetings/:id` — confirm / cancel / reschedule |

## Notes

- Ticket statuses: `New`, `Open`, `InProgress`, `Closed`
- Meeting statuses: `scheduled`, `confirmed`, `canceled`, `completed`
- Client close = PATCH `{ "status": "Closed" }`
- Client cancel meeting = DELETE or PATCH `{ "status": "canceled" }`
