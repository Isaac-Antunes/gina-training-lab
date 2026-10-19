# Security & Safety Architecture

This document distinguishes between what Gina **guarantees by structural construction**, what is **empirically verified by automated tests**, and what **remains out of scope** prior to external multi-tenant certification.

> [!NOTE]
> Gina's primary defense against indirect prompt injection and policy drift is **structural capability restriction**, not prompt wording alone. Neither the Node server nor the Salesforce Agentforce agent has any tool capable of sending external messages.

## Structural Guarantees by Construction

| Threat / Risk | Architectural Mitigation | Implementation Location |
|---|---|---|
| **Unauthorized customer messaging** | Zero external messaging tools exist. The sole write capability creates an internal Salesforce `Task` for the human owner. | `GinaService.createOwnerTask`, 3 `@InvocableMethod` classes, `ownerTask.ts` |
| **Contacting unconsented or opted-out users** | Missing or revoked consent—or `HasOptedOutOfEmail`—triggers an immediate hard block before rhythm or VIP evaluation. | `GinaRules.readConsent`, `GinaRules.evaluate`, `crmMath.ts` |
| **Unauthorized CRM data exposure (FLS / Sharing)** | `Contact` records are filtered with `Security.stripInaccessible(AccessType.READABLE, ...)`; `Order` and `Task` queries enforce `WITH USER_MODE`; all Apex classes declare `with sharing`. | `GinaService.cls` |
| **Fail-open on unreadable consent fields** | If a user lacks FLS read permission on `Gina_WhatsApp_Consent__c`, `readConsent` resolves to `missing` (fail-closed) and blocks outreach. | `GinaRules.readConsent` |
| **Forged or duplicate task creation** | `createOwnerTask` re-computes the customer decision directly from database records and aborts if an open `Gina:%` task already exists. | `GinaService.createOwnerTask`, `findOpenTask` |
| **Unprivileged database writes** | `Task` insertion executes via `Database.insert(task, AccessLevel.USER_MODE)`. | `GinaService.cls` |
| **Hallucinated LLM metrics or policy drift** | Agent instructions prohibit manual math, and all classifications originate exclusively from deterministic TypeScript/Apex engines. | `Gina.agent`, `GinaRules.cls`, `crmMath.ts` |
| **Apex governor limit exhaustion** | Queries are explicitly bounded to 5,000 contacts and 20,000 orders. | `GinaService.cls` |
| **Local server DNS rebinding / LAN exposure** | `server.ts` binds exclusively to `127.0.0.1` and validates the `Host` header via `hostGuard` middleware before routing. | `server.ts`, `src/utils/hostGuard.ts` |

## Least-Privilege Permission Architecture

Access in Salesforce is intentionally split across two distinct permission sets:

- `Gina_Demo`: Grants access to the 3 Apex invocable actions and read access to `Gina_WhatsApp_Consent__c`, `Gina_Ignored_Contacts__c`, and `HasOptedOutOfEmail`.
- `Gina_Agente`: Grants access to the conversational Agentforce employee agent UI.

A user without `Gina_Demo` cannot read the custom consent field; Gina automatically treats this as `missing` consent, suggests zero contacts, and creates zero tasks (formally proven by `GinaActionsTest.withoutReadAccessToConsentTheGinaNeverSuggestsContact`).

## Defense-in-Depth Against Prompt Injection

1. **Bounded Action Space:** Even if an adversarial payload inside a customer record attempts to override model instructions, the Agentforce agent only possesses three Apex tools: list, analyze, and create an owner review task. None of these tools can transmit external messages, and `create_owner_task` re-verifies consent and eligibility in Apex before writing.
2. **Context Sanitization (`src/utils/contextEngineering.ts`):** Strips zero-width and bidirectional Unicode characters, flags buried instruction overrides and external Markdown image trackers, and purges injected privilege fields (`isVipTier`, `bypassConsent`, `expectedAction`) before data reaches the prompt builder.
3. **Adversarial Evaluation Benchmark:** The consent-violation and injection scenario is documented in `playground/cenario-6-violacao-de-consentimento-injecao-maliciosa.md` and executed automatically via `npm test`.

## Data & Supply-Chain Hygiene

- All repository demonstration records are **100% synthetic** (zero real customer PII).
- Local credentials reside exclusively in `.env.local` (ignored by Git and excluded from `public/gina-training-lab-updated.zip`). The public showcase (`npm run build:showcase`) uses zero environment variables, verified by `scripts/showcase.test.mjs`.
- Dependencies are installed with `--frozen-lockfile`. Lifecycle scripts are restricted via `allowBuilds` in `pnpm-workspace.yaml` (only `esbuild` is permitted; `@google/genai` and `protobufjs` are explicitly denied).

## Out-of-Scope Areas & Operational Warnings

- **Salesforce AppExchange Security Review:** Required prior to commercial AppExchange listing; not yet submitted.
- **High-Volume Load Testing:** Governor caps (5,000 contacts / 20,000 orders) are enforced statically; large-scale enterprise batching requires asynchronous Apex (`Batchable` / Data Cloud) if scaled beyond small retail.
- **Operator Guidelines:**
  1. Assign `Gina_Demo` only to operators authorized to view customer consent records.
  2. Record documented opt-in consent before expecting outreach tasks; silence in the absence of consent is by design.
  3. Never run `npm run sf:seed` against a production org—it is strictly for Developer Edition and scratch orgs.
