# External API — BNI Finance Integration

Machine-to-machine API for external systems (e.g. BNI Finance) to read member
data and write back renewal confirmations. Separate from the cookie-session app
auth: external callers use a **bearer API key**.

Base path: `/api/external/v1`

---

## Authentication

Every request must send a bearer key:

```
Authorization: Bearer bnifin_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- Keys are issued by a National Admin (see "Key management").
- The raw key is shown **once** at creation and stored only as a SHA-256 hash —
  it cannot be recovered. Lost keys must be revoked and re-issued.
- A key has scope `finance`: read members + write back renewals, across **all
  chapters** (national scope).
- Missing/invalid/expired/inactive key → `401`. Wrong scope → `403`.

---

## Endpoints

### `GET /api/external/v1/members`

List members (every chapter). Ordered by `renewal_date` ascending.

Query parameters (all optional):

| Param           | Type   | Description                                              |
|-----------------|--------|----------------------------------------------------------|
| `chapterId`     | uuid   | Restrict to one chapter.                                 |
| `status`        | string | `active` \| `inactive` \| `suspended`.                   |
| `renewalBefore` | date   | `YYYY-MM-DD` — members due on/before this date (invoice run). |
| `limit`         | int    | Page size, default 50, max 200.                          |
| `offset`        | int    | Page offset, default 0.                                  |

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "chapter_id": "uuid",
      "chapter": "BNI Grow Chapter",
      "name": "Ahmad Santoso",
      "email": "ahmad@example.com",
      "phone": "0812...",
      "company": "PT Santoso Jaya",
      "business_field": "Consulting",
      "status": "active",
      "joined_date": "2025-01-10",
      "renewal_date": "2026-01-10",
      "last_renewed_at": "2025-01-10T03:00:00.000Z",
      "updated_at": "2025-06-01T03:00:00.000Z"
    }
  ],
  "pagination": { "total": 1659, "limit": 50, "offset": 0, "hasMore": true }
}
```

Example — who is due by month-end:

```
GET /api/external/v1/members?renewalBefore=2026-06-30&status=active&limit=200
```

### `GET /api/external/v1/members/:id`

Single member. `404` if not found. Same object shape as above under `data`.

### `POST /api/external/v1/members/:id/renewal`

Confirm a paid renewal: pushes `renewal_date` forward and reactivates the member
(`status` → `active`, `last_renewed_at` → now).

Body (optional):

```json
{ "renewedUntil": "2027-01-10", "cycleMonths": 12 }
```

- `renewedUntil` (`YYYY-MM-DD`) — set the next renewal date explicitly. Wins over
  `cycleMonths`.
- `cycleMonths` (int, 1–120) — advance from the later of the current
  `renewal_date` or today by this many months. Defaults to **12** when neither
  field is given.

Response: the updated member (external shape). `404` if the member does not
exist; `400` on malformed `renewedUntil` / `cycleMonths`.

---

## Renewal lifecycle

1. A member has a `renewal_date` (the invoice send date).
2. Finance pulls due members (`renewalBefore=…`) and sends invoices.
3. On payment, Finance calls `POST /members/:id/renewal` → date advances, member
   stays `active`.
4. If a member is **not** renewed, a daily job
   (`/api/cron/deactivate-overdue-members`, 01:00 UTC) flips them to `inactive`
   once `renewal_date` is more than `RENEWAL_GRACE_DAYS` (14) days in the past.
   Every status change is written to the activity log.

The cron job is protected by `CRON_SECRET` (Vercel sends it as a bearer token).
Configure `CRON_SECRET` in the environment for the schedule to run.

---

## Key management (National Admin, app session)

Internal endpoints — require a National Admin login session, not an API key.

- `GET /api/national/api-keys` — list keys (metadata only, never the raw key).
- `POST /api/national/api-keys` — body `{ "name": "BNI Finance Prod", "expiresAt"?: ISO }`.
  Returns the new key incl. `rawKey` **once**.
- `DELETE /api/national/api-keys?id=<uuid>` — revoke (sets `is_active=false`).

---

## Setup checklist

1. Apply migration `014_member_renewal_and_finance_api.sql`.
2. Set `CRON_SECRET` in the deployment environment.
3. Create a key via `POST /api/national/api-keys` and hand the `rawKey` to Finance.
4. Backfill `renewal_date` on existing members as needed.
