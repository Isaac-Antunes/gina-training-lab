# CRM-Agnostic by Design (with Mentorship)

> **One-line:** Salesforce/Agentforce is the reference implementation in this
> repository; the decision layer is portable to other CRMs, to spreadsheets, and
> to a manual weekly routine — and implementations on simpler stacks are
> delivered with Isaac's mentorship.

Gina's value is not the CRM. It is the **decision layer**:

```
canonical customer state  →  deterministic policy  →  explanation  →  one human-approved task
```

Any system that can provide contacts, purchase/activity history and consent
evidence can feed that pipeline. The CRM only changes the adapter, not the
guarantees.

## 1. What stays the same on every stack

| Invariant | Why it must not change |
|---|---|
| **Canonical model** | Contacts, purchase/activity events, consent state, notes and a stable customer ID. Adapters map the CRM's fields into this shape. |
| **Deterministic rules** | Median purchase rhythm, recency-to-rhythm ratio, RFV competition-rank VIP, 90-day dormancy, unit-margin check. No LLM is allowed to invent these numbers. |
| **Fail-closed consent** | Missing, revoked, unproven or conflicting consent blocks contact-related action. |
| **Human in the loop** | No autonomous messaging. The output is at most one review task/queue item for a person. |
| **Explainability** | Every decision shows *why this customer, why today*: the inputs, the rule, the recommended action. |
| **Evaluation** | Cross-runtime parity, adversarial cases and regression tests run against the adapter's data. |

## 2. What changes per CRM

| Change | Examples |
|---|---|
| **Field mapping** | Which object is the "purchase" (order, deal, invoice, ticket, visit)? Which field proves consent? |
| **Read path** | Native API, export/CSV, webhook, or manual intake. |
| **Write path** | Task, note/activity, or no write at all — a reviewed queue/CSV instead. |
| **Auth & limits** | OAuth tokens, rate limits, pagination, sandbox vs production. |
| **Consent semantics** | LGPD opt-in proof, channel-specific authorization (WhatsApp vs e-mail), revocation history. |
| **Adapter tests** | Fixture mapping, idempotency, fail-closed behavior when fields are unreadable. |

## 3. Compatibility matrix

| Stack | Read path | Write path | Mode | Notes |
|---|---|---|---|---|
| **Salesforce (Sales/Service) + Agentforce** | Native REST / Apex (`USER_MODE`) | `Task` for the owner | **Reference** | Full implementation in this repo: Apex parity, Agentforce topics, official agent tests. |
| **HubSpot** | Contacts, deals, engagements API | Task/note | **Adapter** | Map deal stage/close date or engagement events to purchase events; consent from subscription/legal basis. |
| **Pipedrive** | Persons, deals, activities API | Activity | **Adapter** | Activities work well as purchase/visit events; consent needs a custom field or marketing-status mapping. |
| **RD Station CRM** | CRM API | Task | **Adapter** | Common in Brazilian SMBs; confirm export/API scope on the plan. |
| **Zoho CRM** | REST API | Task | **Adapter** | Flexible modules; map custom consent fields explicitly. |
| **Microsoft Dynamics 365** | OData API | Task | **Adapter (larger)** | More configuration/security surface; usually a mid-market engagement. |
| **Google Sheets / Excel** | CSV/XLSX import | Review queue / CSV | **Import** | The "até as mais simples" path: weekly sheet in, prioritized queue out. No API, no write-back. |
| **ERP, custom or WhatsApp lists** | CSV export or API | Manual queue | **Import / Manual** | Data quality and consent proof define what is possible; fail closed when missing. |
| **No CRM at all** | Intake form + sheet | Weekly queue | **Manual** | Starts with a minimal data contract; mentorship covers the routine and governance. |

**Mode meaning:** *Reference* = fully shipped here. *Adapter* = mapping + tests on
top of the same policy engine. *Import* = spreadsheet/export mode. *Manual* =
human-operated queue with deterministic rules applied to the intake data.

## 4. Simple stacks (the "até as mais simples" path)

For a store that runs on a spreadsheet, a WhatsApp list or a lightweight CRM:

1. **Minimal data contract** — customer name/ID, purchase or visit dates, amounts,
   consent status + evidence, and optional notes.
2. **Weekly import** — CSV/XLSX (or a shared sheet) is validated, normalized and
   deduplicated. This mode is implemented and tested:
   ```bash
   npm run crm:queue -- playground/csv-exemplo-compras.csv --today 2026-10-19
   ```
   See [csv-import.md](csv-import.md) for the column schema, consent mapping,
   flags and output format.
3. **Deterministic queue** — the engine outputs a short, prioritized "who needs
   attention today" list with the reason and suggested action.
4. **Human execution** — the owner reviews and contacts manually; the task/queue
   is the audit trail. Nothing is auto-sent.
5. **Weekly ritual + metrics** — reviewed in the mentorship cadence (see §6).

No dashboard to babysit. The deliverable is a one-page review queue.

## 5. Honest boundaries

- **Not plug-and-play for every CRM.** Each adapter needs field mapping, consent
  semantics and tests before it can be trusted.
- **Data and consent are prerequisites.** Without purchase/activity history the
  engine asks for data; without consent proof it fails closed.
- **No autonomous messaging, on any stack.** The write path is a task/queue for a
  human, never a customer message.
- **No silent write-back.** Writing to a customer's CRM requires an explicit,
  permissioned adapter.
- **The LLM explanation is optional.** The deterministic mode works offline; the
  language layer only explains pre-computed decisions.
- **Every stack is evaluated, not assumed.** Adapter fixtures and regression
  cases are part of the delivery.

## 6. Mentorship as the delivery layer

Simpler stacks are not "inferior" — they just need a person to map the data and
to run the weekly ritual. That is where the mentorship fits:

| Phase | What happens |
|---|---|
| **Diagnostic** | Current CRM/stack, data quality, consent evidence, channels, decision process; a written gap map. |
| **Mapping** | CRM fields → canonical model; consent and LGPD rules; purchase/activity event definition. |
| **Implementation** | Adapter or CSV pipeline, policy configuration, parity/adversarial tests. |
| **Operating ritual** | Weekly review queue, owner-approved tasks, metrics, holdout control. |
| **Training** | Team learns to read the decisions and to respect consent; no automation of customer contact. |
| **Governance** | Prompt/security review, audit trail, escalation rules, periodic recalibration. |

**Formats:** diagnostic, assisted implementation, and recurring mentorship.
**For:** retail and service teams on Salesforce, HubSpot, Pipedrive, RD Station,
Zoho, Dynamics — or on a spreadsheet. **Outcome:** a working review queue, a
documented field/consent map, test evidence, and an operating playbook.

## 7. FAQ

**Do I need Salesforce?** No. Salesforce/Agentforce is the reference
implementation; other CRMs use adapters, and simple stacks use import/manual mode.

**Can it work with just a spreadsheet?** Yes — that is the import mode: a weekly
CSV/sheet in, a prioritized review queue out.

**Does it send WhatsApp/e-mail?** No. It prepares a queue or a task for a human;
the team owns every conversation.

**Will it work with my ERP/custom system?** Depends on export or API access; the
adapter work is scoped in the diagnostic.

**Is the Salesforce version a different product?** No — same deterministic
policy, same consent guarantees, same human-in-the-loop contract. Only the
adapter and the surface (Agentforce vs local lab vs spreadsheet) change.

## 8. Resumo em português (para clientes e mentorados)

O Gina Intell não é um produto preso à Salesforce. O valor está na **camada de
decisão**: dados do cliente → regras determinísticas → explicação → uma tarefa
para uma pessoa aprovar.

- **Salesforce/Agentforce** é a implementação de referência deste repositório.
- **Outros CRMs** (HubSpot, Pipedrive, RD Station, Zoho, Dynamics) entram por
  adaptadores: o mesmo motor, com mapeamento de campos e consentimento.
- **CRMs simples, planilhas e listas** entram no modo importação/manual: uma
  planilha semanal vira uma fila de revisão curta e explicada.
- **A mentoria** cobre diagnóstico, mapeamento, implantação, ritual semanal,
  treinamento do time e governança — é o que torna o modo simples viável.
- **O que nunca muda:** consentimento falha fechado, nenhuma mensagem automática
  ao cliente, uma tarefa por vez para o dono aprovar.

Quer avaliar o seu cenário? Comece por um diagnóstico: CRM atual, dados
disponíveis, prova de consentimento e canais. A partir daí definimos se o
caminho é nativo, adaptador, planilha ou operação manual assistida.
