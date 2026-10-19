# How Gina Works · Deterministic Policy & Action Architecture

Gina is a deterministic CRM lifecycle and governance layer for small retail operations. It reads customer profiles (`Contact`) and purchase histories (`Order`), computes **one deterministic classification per customer**, and—only when human intervention is warranted—creates a single **review task (`Task`) for the store owner**.

**Hard Safety Invariant:** Gina **never** autonomously transmits messages to customers.

## The Four Possible Policy Outcomes

| Outcome | Meaning | Generates Owner Task? |
|---|---|---|
| **Silence (`no_message` / `dormancy_rest`)** | Customer is in rhythm, in a 90-day dormancy rest period, or lacks actionable urgency. | **No** |
| **Friendly Nudge (`friendly_nudge` / `welcome_message` / `second_purchase_prompt`)** | Customer is moderately delayed, newly acquired ($\le 30$ days), or stalled after a single purchase ($> 30$ days). | **Yes** (`Normal` priority for owner approval) |
| **Human Concierge (`concierge_human`)** | VIP customer in the delay window ($1.5 < \text{ratio} \le 3.0$). Requires personal outreach from the owner/team. | **Yes** (`High` priority) |
| **Blocked (`refuse_spam` / `request_opt_in` / `request_data` / `reject_invalid_data`)** | Consent is missing or revoked, email opt-out is active, or input data is invalid/insufficient. | **No** |

Core methodology principle: **"Less noise. More relevance."**

## Strict 10-Stage Decision Precedence

Both `analyzeCustomerRhythm` (`src/utils/crmMath.ts`) and `GinaRules.evaluate` (`GinaRules.cls`) evaluate rules in this exact sequential order; the first matching condition terminates evaluation:

1. **Invalid Financial Data** (negative total spend): Reject immediately (`reject_invalid_data`).
2. **Revoked Consent**: Absolute block (`refuse_spam`), overriding even VIP status.
3. **Missing Consent**: Block commercial messaging (`request_opt_in`); require explicit opt-in first.
4. **Zero Purchases**: Request purchase history (`request_data`); never classify a non-buyer as VIP.
5. **Invalid or Future Dates**: Reject corrupted or future-dated order timestamps (`reject_invalid_data`).
6. **Single Purchase Day** (cannot infer a multi-order interval):
   - Recency $\le 30$ days $\rightarrow$ **New Customer** (`welcome_message`).
   - Recency $> 30$ days $\rightarrow$ **Single Purchase Stalled** (`second_purchase_prompt`).
7. **90-Day Dormancy Protection**: Triggered when `ignoredContactsCount >= 3` **or** recency exceeds $3.0\times$ the median purchase interval (`ratio > 3.0`). Dormancy rest (`dormancy_rest`) overrides VIP status to prevent spam fatigue and opt-outs.
8. **VIP in Delay Window**: Confirmed VIP with $1.5 < \text{ratio} \le 3.0$ $\rightarrow$ personal human outreach (`concierge_human`).
9. **In Rhythm**: Recency within $1.5\times$ the median interval ($\text{ratio} \le 1.5$) $\rightarrow$ silence (`no_message`).
10. **Standard Delay Window**: Recency between $1.5\times$ and $3.0\times$ the median interval ($1.5 < \text{ratio} \le 3.0$) $\rightarrow$ friendly reminder (`friendly_nudge`).

**Purchase Rhythm Definition:** The **median** of day intervals between chronologically sorted distinct purchase dates. The **ratio** is $\text{recencyDays} / \text{medianIntervalDays}$. A ratio of exactly $1.5$ is classified as **In Rhythm**; a ratio of exactly $3.0$ remains in the **Delay** window.

## Deterministic VIP Tier (RFV Rule of Thirds)

A customer qualifies as **VIP** if and only if they rank in the **top third ($\lceil N / 3 \rceil$) simultaneously in both order frequency and total monetary spend**, using standard competition ranking (`1, 2, 2, 4`) for ties.
- The active buyer base must contain **at least 3 customers with completed orders** ($N \ge 3$); smaller bases refuse to extrapolate percentiles.
- Contacts with zero activated orders are excluded from the buyer pool and can never be classified as VIP.
- Canceled or draft orders are excluded from frequency and spend calculations.

## Conservative Consent Resolution (Fail-Closed)

Consent is never assumed:

| CRM Signal | Resolved Consent State |
|---|---|
| `Contact.HasOptedOutOfEmail == true` | `revoked` |
| `Contact.Gina_WhatsApp_Consent__c == 'revoked'` | `revoked` |
| `Contact.Gina_WhatsApp_Consent__c == 'granted'` | `granted` |
| Null, blank, unknown value, or **field unreadable due to Field-Level Security (FLS)** | `missing` (blocks outreach) |

## Bounded Write Capability

The only write operation performed by Gina is inserting a single Salesforce `Task` with subject `Gina: <action title> · <customer name>`, dated today, containing the deterministic audit rationale. Before inserting:
1. The server/Apex service **re-queries the org and re-computes the policy decision** (ignoring any caller-supplied action).
2. It checks for any existing open `Gina:%` task on the `Contact` (`IsClosed = false`) and refuses to create duplicates.
3. Every task description explicitly states that no message was sent to the customer.

## System Components

| Component | Role |
|---|---|
| `GinaRules.cls` / `crmMath.ts` | Pure deterministic math and precedence rules: zero database writes, zero LLM calls. |
| `GinaService.cls` | Queries `Contact` and `Order` under caller permissions (`USER_MODE` / `stripInaccessible`); creates idempotent owner `Task` records. Enforces governor safety caps (5,000 contacts / 20,000 orders). |
| `GinaCustomersNeedingActionAction` | Read-only `@InvocableMethod` listing customers requiring owner attention. |
| `GinaAnalyzeCustomerAction` | Read-only `@InvocableMethod` returning the deterministic breakdown for a specific customer. |
| `GinaCreateOwnerTaskAction` | Audited `@InvocableMethod` that re-evaluates policy and creates an owner review `Task`. |
| `Gina.agent` (Agent Script) | Conversational interface inside Salesforce Agentforce; strictly explains outputs returned by Apex actions without calculating metrics or drafting unapproved messages. |
