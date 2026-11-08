# Marketing toolkit connections

No code changes needed: Admin → **Marketing toolkits** lists every provider.
Paste keys/URLs, toggle **Enabled**, **Save**, then **Send test**. All
deliveries appear in the log on the same page.

## Outbound events (club → toolkit)

| Internal event | Fired when | Receivers |
|---|---|---|
| `member.registered` | signup via web/API | Mailchimp, Brevo, SendGrid, GA4, Meta CAPI, TikTok, webhook |
| `booking.created` | seat booked | Brevo, GA4, Meta CAPI, TikTok, webhook |
| `booking.cancelled` | booking cancelled | GA4, webhook |
| `event.published` | event created/published | webhook |

Payloads always include `{ user, event, booking }` where relevant.

## The generic webhook — connect ANYTHING with a URL

Enable **Generic Webhook** and paste a URL from Zapier / Make / n8n /
HubSpot workflows / a Google Sheet bridge… Every event above is POSTed as:

```json
{
  "event": "booking.created",
  "sent_at": "2026-11-08T12:00:00.000Z",
  "data": {
    "user": { "id": 3, "name": "Sara", "email": "sara@example.com" },
    "event": { "id": 1, "title": "Beach Yoga", "starts_at": "…" },
    "booking": { "id": 9, "seats": 2, "status": "confirmed" }
  }
}
```

From there Zapier/Make can forward to **any** marketing tool (SMS, ads
audiences, CRMs, spreadsheets) with zero backend changes.

## Inbound URLs (toolkit → club)

Each integration card shows its **inbound URL**:

```
POST {API_PUBLIC_URL}/api/v1/marketing/inbound/:provider
```

Paste it into the toolkit's webhook/outgoing-integration step. Generic
payload `{ "email": "…", "action": "subscribed|unsubscribed" }` syncs the
member's newsletter preference automatically; anything else is stored and
visible under *Inbound webhooks received*.

## Browser pixels (zero-config)

Paste a **GA4 Measurement ID**, **Meta Pixel ID** or **TikTok Pixel ID** in
the matching integration and the web client auto-loads the snippet for all
visitors (see `client/src/components/MarketingSnippets.jsx`). Server-side
events for the same providers go through their Conversions/Events APIs, so
ad platforms get both browser + server signals.

## UTM / source attribution

Share links like `https://your-club.com/register?utm_source=instagram` —
the signup form captures `utm_source` into the member profile, visible in
Admin → Members and forwarded to toolkits in `member.registered`.
