# Verification & Test Suite Documentation

Current Salesforce status: **17 Apex test methods passing with 99% org-wide code coverage** (Salesforce reports 18 execution entries because it includes the `@TestSetup` method in `GinaActionsTest`). On the Node/TypeScript side, **47 deterministic domain & security challenges** plus **all integration and parity suites** pass offline with zero external API calls.

## Salesforce Apex Test Architecture

| Test Class | Methods | What It Proves |
|---|---|---|
| `GinaRulesTest` | 7 | Isolated deterministic rules: record-to-decision evaluation, consent resolution, VIP competition ranking, dormancy precedence, median calculation, and invalid input rejection. Uses the exact same fixtures as `scripts/salesforce.test.mjs` to guarantee cross-runtime parity. |
| `GinaActionsTest` | 5 | Invocable actions against real SObject records: single task creation without duplicates, zero tasks when the policy recommends silence/block, and fail-closed behavior when Field-Level Security (FLS) denies consent read access. Runs as a store owner with `Gina_Demo`. |
| `GinaJourneyTest` | 5 | **Longitudinal Customer Journeys:** Evaluates the same customer across multiple calendar dates without DML overhead. |

## Longitudinal Journeys (`GinaJourneyTest`)

| Journey | Timeline Progression | Verified Invariant |
|---|---|---|
| **New Customer** | Day 6 welcome $\rightarrow$ Day 15 in rhythm $\rightarrow$ Day 28 friendly nudge $\rightarrow$ Dormancy rest | Verifies state transition and task eligibility (or silence) at each point in time. |
| **VIP Lifecycle** | In rhythm $\rightarrow$ Delayed (human concierge, `High` priority) $\rightarrow$ Dormant | Proves 90-day dormancy overrides VIP status, and delayed VIPs generate `High` priority tasks. |
| **Revoked Consent** | Delayed VIP initially eligible $\rightarrow$ Email opt-out or WhatsApp revocation | Proves immediate hard block and zero tasks despite VIP tier. |
| **Missing Consent** | Newly acquired buyer who never granted opt-in | Proves not even a first-purchase welcome task is generated without consent. |
| **Ignored Contacts Rule** | 2 ignored contacts still permit a friendly nudge $\rightarrow$ 3 ignored contacts trigger dormancy | Proves the strict 3-ignored-contacts dormancy threshold. |

Every journey also asserts that **zero tasks are generated whenever the decision is silence or block**, testing the *"Less noise. More relevance."* invariant longitudinally across time.

## Running the Test Suites

### Node.js / TypeScript (Local, Zero API Calls)

```bash
npm run lint
npm run scan
npm test
npm run build:showcase
```

### Salesforce DX / Apex

```bash
cd salesforce

# Deploy metadata and run all local tests with code coverage (target org alias: gina-dev)
sf project deploy start --source-dir force-app -o gina-dev
sf apex run test --test-level RunLocalTests --result-format human --code-coverage --wait 10 -o gina-dev

# Run only longitudinal journey tests
sf apex run test --class-names GinaJourneyTest --result-format human --wait 10 -o gina-dev
```

## Apex Code Coverage by Class

| Apex Class | Coverage |
|---|---|
| `GinaAnalyzeCustomerAction` | 100% |
| `GinaCreateOwnerTaskAction` | 100% |
| `GinaRules` | 99% |
| `GinaService` | 98% |
| `GinaCustomersNeedingActionAction` | 95% |
| **Org-Wide Average (`0.1.0.1`)** | **99%** |

## How to Add a Longitudinal Journey

1. In `GinaJourneyTest`, construct `Contact` and `Order` test instances using the `contact(...)` and `order(...)` helpers. Never hardcode custom field names as strings—always reference `GinaRules.CONSENT_FIELD` and `GinaRules.IGNORED_FIELD` so tests pass both in un-namespaced scratch orgs and in the `ginaintell` 2GP managed package (see [o-que-deu-errado.md](o-que-deu-errado.md), item 1).
2. Call `seenOn(name, contacts, orders, todayDate)` to evaluate the customer at each simulated date.
3. Assert the **classification**, **recommendedAction**, and **ownerTaskTitle** (`null` when silent/blocked).
4. Pay attention to exact boundary values: a ratio of **exactly `1.5`** is classified as `in_rhythm`; a ratio of **exactly `3.0`** remains in `delay`.
