# Waitlist → n8n → Google Sheets

The landing page form POSTs to `https://n8n.fromsukong.com/webhook/waitlist`.
If n8n is unreachable, the form keeps the email in the visitor's
`localStorage` (no data lost) and shows an error — so activating this
workflow is what makes entries durable.

## Import (2 minutes)

1. n8n UI → Workflows → **Import from file** → `waitlist-workflow.json`.
2. Open the **Append to Sheet** node → create/select your **Google Sheets
   credential** (Google account OAuth, Sheets scope) → pick the spreadsheet
   and the tab (create one named `Waitlist` with header row:
   `email | source | receivedAt | userAgent`).
3. Save, then toggle the workflow **Active**.

## Endpoint contract

`POST /webhook/waitlist` — JSON body:

```json
{ "email": "user@example.com", "source": "landing" }
```

- `200 { "ok": true }` — stored.
- `400 { "ok": false, "error": "invalid_email" }` — bad address.
- CORS allowlist is set on the Webhook node (prod, prelive, preview, and
  localhost dev). Add new preview origins there when needed.

## Notes

- Emails are lowercased/deduplicated by the Sheet's own filtering later;
  the workflow does not block duplicates (idempotence left to the sheet).
- Honeypot field (`website`) is filled by bots only; the form ignores
  submissions that fill it client-side, so it never reaches this webhook.
