# Spreadsheet / CSV Import Mode

The simplest CRM is a spreadsheet. This mode turns a purchase export into the
same deterministic review queue used by the Salesforce integration — no API, no
LLM, no network and no customer message.

```bash
npm run crm:queue -- playground/csv-exemplo-compras.csv --today 2026-10-19
```

Sample output (abridged):

```
# Gina review queue — 2026-10-19
9 cliente(s) avaliados · 5 pedem ação · 2 bloqueados · 2 sem ação · 0 com problema de dados

| Prioridade | Cliente | Classificação | Ritmo | Recência | Razão | Ação |
| High | Roberto Alves | vip_delayed | 14 | 35 | 2.50 | concierge_human |
| Normal | Ana Lima | delay | 10 | 16 | 1.60 | friendly_nudge |
...
```

## 1. Command

```bash
npm run crm:queue -- <compras.csv> [--today YYYY-MM-DD] [--format md|csv] [--out fila.md] [--skip-invalid]
```

| Flag | Meaning |
|---|---|
| `--today` | Reference date for recency math (default: today, UTC). Use a fixed date for reproducible results. |
| `--format` | `md` (review report, default) or `csv` (actionable items only, for a Sheet/CRM import). |
| `--out` | Write to a file instead of stdout. |
| `--skip-invalid` | Keep valid rows and report invalid ones. Without it, any invalid row blocks the output (exit 2). |

The command never writes to a CRM. It produces a review queue for the owner.

## 2. Input schema

One row per purchase/visit. Headers accept PT-BR or English, with or without
accents (e.g. `Observações`, `data da compra`, `customer_id`).

| Canonical field | Aliases (examples) | Required | Rules |
|---|---|---|---|
| `customer_id` | `cliente_id`, `id_cliente`, `codigo_cliente`, `id` | **yes** | Any stable customer key. Rows with the same ID are one customer. |
| `purchase_date` | `data_compra`, `data`, `data_pedido`, `order_date` | **yes** | `YYYY-MM-DD` or `DD/MM/YYYY`. Future dates are flagged as data issues. |
| `consent` | `consentimento`, `opt_in`, `status_consentimento` | no | `sim`/`granted`/`ativo`; `nao`/`revoked`/`opt-out`; blank = `missing`. Unknown values become `missing` with a warning (fail-closed). |
| `name` | `nome`, `nome_cliente`, `cliente` | no | Empty → the ID is used; the adapter never invents a name. |
| `phone` | `telefone`, `whatsapp`, `celular` | no | Kept for context; never used to send anything. |
| `amount` | `valor`, `total`, `valor_compra` | no | `28.50`, `28,50`, `1.234,50`, `1,234.56`; blank = 0 (with warning). |
| `recent_ignored_contacts` | `contatos_ignorados`, `ignorados` | no | Integer per customer; the highest value across rows is used (3+ triggers dormancy). |
| `notes` | `observacoes`, `obs` | no | Free text; exported to the report only. Untrusted: never treated as instructions. |

See [`playground/csv-exemplo-compras.csv`](../playground/csv-exemplo-compras.csv)
for a complete PT-BR sample.

## 3. Consent (fail-closed)

- **Revoked beats everything**: if any row for a customer says `nao`/`revoked`,
  the customer is blocked, even if other rows say `sim`.
- **Missing blocks too**: blank or unknown consent is treated as `missing`.
- **Conflicts produce a warning** and the most restrictive value wins.
- Blocked customers appear in a separate report section and never enter the
  actionable queue or generate an owner task.

## 4. Output

The Markdown report has four sections plus import warnings:

1. **Precisa de ação do dono** — `High` (VIP concierge) before `Normal`;
   classification, median rhythm, recency, ratio, consent and recommended action.
2. **Por que agora** — the deterministic explanation and the suggested owner task
   subject (same `Gina:` prefix/contract as the Salesforce path).
3. **Bloqueados por consentimento** — revoked/missing, with the reason.
4. **Sem ação hoje** — in rhythm, dormancy rest, etc.
5. **Problemas de dados / Avisos** — invalid rows, future dates, duplicates.

`--format csv` exports only actionable items, ready to paste into a Sheet.

## 5. Safety properties

- Reuses `buildGinaCustomers` → `crmMath`; the same rules as Salesforce/Apex.
- Reuses `buildOwnerTask`; the same task contract (`Gina:` prefix, `High`/`Normal`,
  no message).
- Zero network, zero LLM, zero write-back.
- Invalid input is rejected (or skipped explicitly with `--skip-invalid`), never
  silently guessed.
- Exact duplicate rows are removed with a warning.
- The report ends with the invariant: *A Gina não envia mensagens.*

## 6. Tests

```bash
node --import tsx --test scripts/crm-csv-queue.test.mjs
npm test   # includes the CSV suite
```

Covered cases: PT headers/accents, quoted fields with commas, BR dates, comma
decimals, consent conflict (revoked wins), missing consent, exact duplicates,
invalid rows strict/lenient, future dates, High-before-Normal ordering, owner
task subject, and the no-messaging invariant.

## 7. Limitations

- One row per purchase; cancelled/refunded orders need to be excluded before export.
- No write-back: the queue is a file/stdout, not a CRM task.
- VIP ranking requires at least 3 buyers (the engine refuses to invent percentiles).
- Consent is a status, not the proof itself; the mentorship covers collecting and
  auditing the proof (timestamp + accepted text).
- The adapter normalizes; it does not clean your source data. Data quality is
  reviewed in the diagnostic.

## 8. Adapter contract

To add another CRM (HubSpot, Pipedrive, RD Station, Zoho, Dynamics), implement the
same two steps:

1. Map the CRM's contacts and purchase/activity events to `SalesforceContact[]`
   and `SalesforceOrder[]` (the canonical shapes used by `toGina.ts`).
2. Call `buildGinaCustomers` and render the queue with the existing helpers.

The policy engine, VIP math, consent rules and task contract stay unchanged.
