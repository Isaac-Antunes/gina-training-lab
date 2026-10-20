# HubSpot Adapter (Read-Only)

Maps HubSpot contacts and closed-won deals to the same canonical Gina model used
by the Salesforce integration and the spreadsheet mode. No policy is duplicated:
the adapter only builds `SalesforceContact[]` / `SalesforceOrder[]`, then calls
`buildGinaCustomers` (`crmMath`) and the shared review queue.

## 1. Commands

Offline (fixture or exported JSON):

```bash
npm run hubspot:queue -- playground/hubspot-exemplo.json --today 2026-10-19
```

Live, read-only (private app token, no writes):

```bash
HUBSPOT_ACCESS_TOKEN=pat-... npm run hubspot:queue -- --live --max-records 500
```

Common flags: `--today YYYY-MM-DD`, `--format md|csv`, `--out PATH`,
`--won-stages a,b,c`, `--strict`.

## 2. Dataset shape

```json
{
  "contacts": [
    { "id": "hs-1", "properties": {
        "firstname": "Ana", "lastname": "Lima", "email": "ana@example.com",
        "gina_whatsapp_consent": "granted", "hs_email_optout": "false",
        "gina_ignored_contacts": "0" } }
  ],
  "deals": [
    { "id": "d-1", "properties": {
        "amount": "28.50", "closedate": "2026-10-01", "dealstage": "closedwon" },
      "associations": { "contacts": { "results": [{ "id": "hs-1" }] } } }
  ]
}
```

`contactId` can be set directly on a deal instead of `associations` (handy for
fixtures and exports).

## 3. Field mapping

| HubSpot | Canonical | Rule |
|---|---|---|
| `contacts.id` | `Contact.Id` | Stable customer key |
| `firstname` + `lastname` | `Contact.Name` | If empty, the ID is used; a name is never invented |
| `gina_whatsapp_consent` (custom) | WhatsApp consent | `granted` → granted; `revoked` → revoked; anything else → missing |
| `hs_email_optout` | Consent override | `true` → **revoked** (wins over the custom property) |
| `hs_marketable_status` | Informational | Marketable email does **not** authorize WhatsApp; kept for context only |
| `gina_ignored_contacts` (custom) | Ignored contacts | Highest value wins; 3+ triggers dormancy |
| `deals.closedate` | `Order.EffectiveDate` | ISO date/datetime or Unix epoch (s/ms) |
| `deals.amount` | `Order.TotalAmount` | Dot or comma decimals; blank = 0 |
| `deals.dealstage` | Purchase filter | Included only when in `closedWonStages` (default: `closedwon`, `closed_won`, `won`, `ganho`, `fechado_ganho`, `fechadowon`) |
| `associations.contacts.results[0].id` | `Order.BillToContactId` | Deals without an association are reported and skipped |

Consent is conservative: an email opt-out or a revoked WhatsApp property blocks
contact even if another signal says granted; absent values stay `missing`.

## 4. Live mode (read-only)

1. Create a HubSpot **private app** with read scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.deals.read`
2. Export the token in the shell (never commit it):
   ```bash
   export HUBSPOT_ACCESS_TOKEN=pat-...
   ```
3. Run with `--live` (optional `--max-records`, default 1000).

The client only issues `GET /crm/v3/objects/contacts` and
`GET /crm/v3/objects/deals?associations=contacts`, follows `paging.next.after`
and never logs the token. Errors report the HTTP status, not the credential.

## 5. Output

Same queue as the spreadsheet mode: **Precisa de ação do dono** (High before
Normal), **Por que agora** with the deterministic reason and suggested owner task,
**Bloqueados por consentimento**, **Sem ação hoje**, plus import warnings and
unmapped deals. The report ends with *A Gina não envia mensagens.*

## 6. Tests and safety

- 6 tests in [`scripts/hubspot-adapter.test.mjs`](../scripts/hubspot-adapter.test.mjs):
  consent resolution, closed-won filtering, VIP/High ordering, custom won stages,
  orphan deals, epoch dates/comma decimals, contacts without deals (data issues),
  and a mocked live client covering pagination, bearer token, `maxRecords`, and
  HTTP errors without token leakage.
- Offline mapping and queue tests run in `npm test`; the live HTTP path is tested
  with an injected `fetch` (no network).
- Zero writes, zero customer messages, zero LLM calls.

## 7. Limits

- Deals are the purchase event; tickets/line items/custom objects are not read.
- One associated contact per deal; multi-contact deals use the first association.
- Custom pipelines need `--won-stages` with the pipeline's internal stage values.
- `maxRecords` caps each object type; large portals should export or paginate by
  date window.
- Consent is a status, not the proof; collecting and auditing the proof is part
  of the mentorship diagnostic.
- Live mode is not executed in CI, by design (no tokens in the repo).
