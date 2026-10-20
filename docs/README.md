# Gina Technical Documentation & CRM Architecture

Each document in this directory addresses a specific architectural, safety, or operational dimension of **Gina Training Lab** and the **Gina Intell** CRM governance layer. Salesforce/Agentforce is the reference implementation; the decision layer is CRM-agnostic (see [crm-agnostic.md](crm-agnostic.md)).

| Document | Core Question Answered | When to Read |
|---|---|---|
| [funcionamento.md](funcionamento.md) | How does Gina evaluate customers and bound agent actions? | Before understanding the domain model or modifying decision thresholds. |
| [seguranca.md](seguranca.md) | What structural invariants prevent harm, and what remains out of scope? | Before deploying to a Salesforce org or auditing the safety model. |
| [testes.md](testes.md) | What is empirically proven, how do tests run, and how are journeys added? | Before modifying TypeScript or Apex logic. |
| [o-que-deu-errado.md](o-que-deu-errado.md) | What engineering failure modes occurred during 2GP packaging and how are they prevented? | Before packaging, publishing, or provisioning a new org. |
| [salesforce.md](salesforce.md) | How do you connect a Salesforce org, publish the Agentforce bundle, and build a 2GP package? | When setting up local org integration or cutting package versions. |
| [crm-agnostic.md](crm-agnostic.md) | How does the same decision layer run on other CRMs, spreadsheets and manual routines — and where are the boundaries? | Before positioning, scoping or onboarding a non-Salesforce stack. |
| [csv-import.md](csv-import.md) | How do you turn a purchase spreadsheet into a deterministic review queue? | When onboarding a simple stack or running the spreadsheet demo. |
| [mentoria-crm-agnostico.pt-BR.md](mentoria-crm-agnostico.pt-BR.md) | Client-facing one-pager (PT-BR) for the CRM-agnostic offer with mentorship. | When presenting to prospects or mentoring a team on a simple stack. |
| `docs/assets/` | Visual architecture diagrams, character construction, and brand studies. | Reference assets for design and documentation. |

## Repository Component Map

| Path | Responsibility |
|---|---|
| `src/utils/crmMath.ts` | Canonical deterministic CRM policy engine in TypeScript (source of truth for purchase rhythm, RFV competition ranking, and unit margin math). |
| `src/utils/contextEngineering.ts` | Adversarial prompt-injection detector, Unicode normalizer, privilege-key purger, and consent conflict analyzer. |
| `salesforce/force-app/main/default/classes/` | Deterministic Apex port (`GinaRules`), least-privilege org reader/task writer (`GinaService`), 3 Agentforce `@InvocableMethod` actions, and unit/journey tests. |
| `salesforce/force-app/main/default/permissionsets/` | `Gina_Demo`: grants minimal read access to custom consent/ignored-contact fields and invocable actions. |
| `salesforce/agent/` | Native Agentforce employee agent definition (`Gina.agent` in Agent Script) and `Gina_Agente` permission set. |
| `salesforce/sfdx-project.json` | 2GP Managed Package configuration (**Gina Intell**, namespace `ginaintell`). |
| `playground/` | Six canonical retail lifecycle scenarios (including adversarial consent/injection cases). |

## Salesforce Package Lineage

| Package | Type | Namespace | Status |
|---|---|---|---|
| Gina | Unlocked | none | `0.1.0-1` (historical baseline; validated in a clean scratch org). |
| **Gina Intell** | **Managed (2GP)** | `ginaintell` | `0.1.0.1` (**99% Apex code coverage**, verified across 17 unit & longitudinal journey tests). |
