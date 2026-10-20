# Gina + Salesforce Agentforce · Architecture & Integration Guide

An architectural study and production integration guide for running **Gina Intell** on top of Salesforce and **Agentforce**.

## Executive Summary

Gina operates as a **deterministic lifecycle governance layer on top of Salesforce**: it reads `Contact` and `Order` records under the querying user's permissions, evaluates customer timing and RFV standing via pure mathematical rules, explains the result in plain language, and **never sends any message without human owner approval**.

Two complementary integration modes are provided:
1. **Local / Hybrid Connector (`src/integrations/salesforce/`):** Connects the local Node/React laboratory to a Salesforce Developer Edition org via read-only REST queries (`Contact` and `Order`) and idempotent `Task` creation.
2. **Native Agentforce Employee Agent (`salesforce/`):** Runs 100% inside Salesforce via `GinaRules.cls`, `GinaService.cls`, three `@InvocableMethod` actions, and the `Gina.agent` authoring bundle—requiring no external Node server.

## Trailhead Ecosystem Evaluation

We evaluated the 29 public repositories in [trailheadapps](https://github.com/trailheadapps) to identify the cleanest integration targets:

| Sample App | Domain | Suitable for Gina? | Rationale |
|---|---|---|---|
| **coral-cloud** | Hospitality resort, Agentforce, Data Cloud | **Yes (Showcase target)** | Models `Booking__c` with contact lookup, date, total price, status, and cancellation flags—enabling direct calculation of median rhythm, recency, frequency, and spend per guest. |
| **ebikes-lwc** | B2B bicycle distributor | No | Orders represent wholesale reseller shipments rather than recurring end-customer retail purchases. |
| **agent-script-recipes** | Agentforce Agent Script patterns | Reference | Canonical reference for `AiAuthoringBundle` syntax and action transitions. |
| **apex-recipes** / **lwc-recipes** | Platform code patterns | Reference | Reference for `USER_MODE`, `stripInaccessible`, and invocable action patterns. |

### Domain Mapping: Gina Method $\rightarrow$ Coral Cloud Schema

| Gina Concept | Coral Cloud Field | Notes |
|---|---|---|
| Purchase dates (median rhythm) | `Booking__c.Date__c` | One booking = one purchase event; exclude `Is_Canceled__c = true`. |
| Frequency | Count of `Booking__c` per `Contact__c` | Also mirrored in `Contact.Lifetime_Experience_Bookings__c`. |
| Total Spend | Sum of `Booking__c.Total_Price__c` | Also mirrored in `Contact.Lifetime_Value__c`. |
| Recency | `today - max(Date__c)` | |
| VIP Tier (top third in frequency & spend) | Computed deterministically by Gina | Can be cross-checked against `Contact.Level__c`. |
| Consent | `Contact.HasOptedOutOfEmail` + custom channel field | Requires custom WhatsApp consent field (`Gina_WhatsApp_Consent__c`). |

---

## How the Node $\leftrightarrow$ Salesforce Integration Works

1. **Read-Only Discovery:** Queries `Contact` and `Order` over the Salesforce REST API (`v62.0`), dynamically inspecting `/sobjects/Contact/describe` so it only requests fields the current user has permission to read.
2. **Deterministic Calculation:** Evaluates purchase rhythm, recency ratio, RFV competition rank, and consent status via [`src/utils/crmMath.ts`](../src/utils/crmMath.ts).
3. **Human-in-the-Loop Approval:** The sole permitted write operation is `POST /services/data/v62.0/sobjects/Task` to create an owner review task (`Subject LIKE 'Gina:%'`), after verifying no open Gina task already exists for that contact.
4. **Holdout Control Discipline:** Reserves a randomized control group prior to measuring campaign lift (Rule 10).

### Connecting a Developer Edition Org Locally

1. Authenticate with Salesforce CLI:
   ```bash
   sf org login web --alias gina-dev --browser chrome
   ```
2. Export session credentials into `.env.local` (never prints the token to stdout):
   ```bash
   npm run sf:env
   ```
3. Deploy the Salesforce metadata and assign the permission set:
   ```bash
   cd salesforce
   sf project deploy start -o gina-dev -d force-app
   sf org assign permset -n Gina_Demo -o gina-dev
   ```
4. *(Optional — Developer Edition / scratch orgs only)* Seed the 9 synthetic retail customer profiles and 26 orders:
   ```bash
   npm run sf:seed
   # To remove all synthetic seed records atomically:
   npm run sf:seed -- --remove
   ```
5. Start the local server (`npm run dev`) and open **Salesforce $\rightarrow$ Live Org**.

---

## Native Agentforce Architecture (`salesforce/`)

Gina also runs natively inside Salesforce as an internal **Agentforce Employee Agent**:

- **Cross-Runtime Apex Parity (`GinaRules.cls`):** Exact port of `crmMath.ts`, `toGina.ts`, and `ownerTask.ts`. Verified across 29 contact profiles to produce the exact same classification, action, and explanation string as Node/TypeScript.
- **Caller-Scoped Security (`GinaService.cls`):** Enforces `with sharing`, `Security.stripInaccessible(AccessType.READABLE, ...)`, and `WITH USER_MODE`. Unreadable consent fields fail closed (`missing`).
- **Three `@InvocableMethod` Actions:**
  - `GinaCustomersNeedingActionAction`
  - `GinaAnalyzeCustomerAction`
  - `GinaCreateOwnerTaskAction`
- **Agent Script Bundle (`Gina.agent`):** Located at `salesforce/agent/main/default/aiAuthoringBundles/Gina/Gina.agent`.

### Deploying and Publishing the Agentforce Bundle

```bash
cd salesforce
sf project deploy start -o gina-dev -d force-app -d agent --test-level RunSpecifiedTests --tests GinaRulesTest --tests GinaActionsTest
sf agent publish authoring-bundle -o gina-dev --api-name Gina
sf agent activate -o gina-dev -n Gina
sf org assign permset -n Gina_Demo -o gina-dev     # Grants access to custom fields & Apex actions
sf org assign permset -n Gina_Agente -o gina-dev   # Grants access to the Agentforce agent panel
```

> [!IMPORTANT]
> `sf agent publish` generates org-specific metadata under `aiAgents/` and `aiAgentDefinitionVersions/`. Both directories are intentionally excluded via `.gitignore` and `.forceignore`; the canonical source of truth is `aiAuthoringBundles/Gina/Gina.agent`.

### Agent topics: CRM lifecycle + pre-sales/SDR

The bundle runs two additive modes behind one router:

| Topic (`subagent`) | Purpose |
|---|---|
| `customer_care` | CRM lifecycle: who needs attention, explain a decision, create one owner `Task` (unchanged) |
| `salesforce_discovery` | Qualify a prospect before recommending; funnel and handoff signals |
| `salesforce_solution` | Portfolio fit, editions, pricing policy, architecture, migration, complex problems |
| `salesforce_objection` | Price, complexity, adoption, security/LGPD, incumbent CRM, competition |
| `off_topic` | Scope defense for anything outside the two modes |

The pre-sales knowledge (portfolio names as of 2026, editions, consumption models,
ICP, discovery questions, objection matrices, talk tracks) is documented in
[`gina-presales-sdr.md`](gina-presales-sdr.md). The underlying research notes (a
PT-BR playbook and a public-site recon) are kept private and can be shown in a
deep-dive; only the distilled agent behavior is published. The agent never invents
price/feature/case data; unknown data is deferred to a specialist.

> [!NOTE]
> `sf agent publish authoring-bundle` resolves the authoring bundle from the
> project's **default** package directory (`force-app`). This repository keeps
> the bundle in the `agent/` package directory, so publishing requires moving the
> bundle temporarily or adjusting `sfdx-project.json`. The canonical source stays
> at `agent/main/default/aiAuthoringBundles/Gina/Gina.agent`.

### Official Agentforce tests (NGT)

The pre-sales mode is covered by the official Agentforce Studio test runner. The
spec is [`salesforce/specs/GinaPresalesSDR-ngtTestSpec.yaml`](../salesforce/specs/GinaPresalesSDR-ngtTestSpec.yaml);
see [`testes.md`](testes.md#agentforce-agent-tests-ngt) for the test matrix and
commands, and `npm run agent:report -- <results.json>` for a deterministic local
pass/fail report.

---

## 2GP Managed Package (`Gina Intell`)

- **Namespace:** `ginaintell` (configured in [`salesforce/sfdx-project.json`](../salesforce/sfdx-project.json)).
- **Coverage:** **99% Apex code coverage** across `GinaRulesTest`, `GinaActionsTest`, and `GinaJourneyTest`.
- **Dynamic Namespace Field Resolution:** Uses `GinaRules.CONSENT_FIELD` and `GinaRules.IGNORED_FIELD` (`getDescribe().getName()`) so all SOQL and field map lookups remain namespace-safe.

To create a new package version on a linked Dev Hub:

```bash
cd salesforce
sf package version create --package "Gina Intell" --installation-key-bypass --code-coverage --wait 30 --target-dev-hub gina-dev
```

Full documentation index: [`docs/README.md`](README.md).
