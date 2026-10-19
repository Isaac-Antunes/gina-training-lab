# Engineering Post-Mortem & Lessons Learned

A transparent post-mortem log of edge cases, Salesforce 2GP packaging failure modes, and operational lessons encountered while building **Gina Intell**. Each entry records **what happened**, **the root cause**, and **the structural fix**.

## 1. Namespace Prefixing Caused All Contacts to Fail Closed in 2GP Managed Packaging (Critical)

- **What happened:** The first attempt to build a 2GP managed package version failed with 11 test assertions breaking. In every failing test, customer consent resolved to `missing`, causing Gina to block all outreach.
- **Root cause:** In a namespaced 2GP package (`ginaintell`), custom fields acquire a runtime prefix (`Gina_WhatsApp_Consent__c` becomes `ginaintell__Gina_WhatsApp_Consent__c`). The initial implementation looked up unprefixed string keys inside `getPopulatedFieldsAsMap()`.
- **Why it passed previously:** Scratch and Developer Edition orgs without a namespace use unprefixed field names, so the bug only surfaces during managed package version creation.
- **Structural fix:** Introduced `GinaRules.CONSENT_FIELD` and `GinaRules.IGNORED_FIELD`, resolved dynamically via `Contact.<Field>.getDescribe().getName()`, which returns the exact runtime field name with or without a namespace prefix.
- **Safety takeaway:** Because of the **fail-closed consent invariant** (*"without documented consent, nothing leaves"*), this failure mode defaulted safely to silence (`missing`) rather than leaking unauthorized outreach.

## 2. Salesforce Free Edition Orgs Cannot Register a Package Namespace

- **What happened:** In a Free Edition org, the Package Manager page omitted the **Edit** button under Namespace Settings.
- **Root cause:** Salesforce only permits namespace registration in a **Developer Edition** org, and that org **cannot be the Dev Hub org itself**.
- **Remediation:** Provision a dedicated Developer Edition org exclusively to register and hold the `ginaintell` namespace, then link it to the Dev Hub via **Namespace Registries**. Never delete the namespace-holding org.

## 3. Managed Package Creation Requires `namespace` at the Root of `sfdx-project.json`

- **What happened:** Running `sf package create --package-type Managed` failed with a missing-namespace error.
- **Root cause:** The CLI reads the namespace from the root `"namespace"` property inside `sfdx-project.json` rather than a command-line flag, and rewrites `sfdx-project.json` upon completion.
- **Remediation:** Declare `"namespace": "ginaintell"` in `sfdx-project.json` prior to package creation and audit the file diff afterward to remove duplicate `packageDirectories` entries.

## 4. Agent Script (`AiAuthoringBundle`) Cannot Be Included Inside a 2GP Package

- **Root cause:** In Salesforce Metadata API coverage, `AiAuthoringBundle` supports Metadata API deployment and Source Tracking, but is not yet supported inside 2GP managed/unlocked package containers.
- **Consequence:** The 2GP package (`salesforce/force-app`) distributes the deterministic Apex rules, invocable actions, custom fields, and `Gina_Demo` permission set. The conversational Agent Script bundle lives in `salesforce/agent/` and is published to the target org via `sf agent publish authoring-bundle`.
- **Future path:** If single-click AppExchange packaging of the conversational layer is required before Salesforce adds `AiAuthoringBundle` 2GP support, port the agent definition to `GenAiPlannerBundle` / `GenAiPlugin` / `GenAiFunction`.

## 5. Exact Floating-Point Boundary in Longitudinal Journey Tests (`ratio == 1.5`)

- **What happened:** `threeIgnoredMessagesPutAnActiveCustomerToRest` initially expected `delay` on Day 15 for a customer with a 10-day median rhythm, but received `in_rhythm`.
- **Root cause:** A 15-day recency over a 10-day median rhythm yields a ratio of **exactly `1.5`**, which is inclusively classified as `in_rhythm` ($\text{ratio} \le 1.5$). The bug was in the test fixture date, not the rule engine.
- **Remediation:** Select interior dates for nominal state transitions and test exact boundary values (`1.5` and `3.0`) in dedicated boundary assertions.

## 6. `@TestSetup` Count in Salesforce Test Summaries

- **What happened:** The Salesforce test runner UI displays `18` methods executed when there are **17** `@IsTest` methods, because it counts `@TestSetup` in `GinaActionsTest` as a separate execution row.
- **Remediation:** Document the exact per-class `@IsTest` method count (`7 + 5 + 5 = 17`) in [`testes.md`](testes.md).

## 7. Salesforce CLI `sf agent preview` Quirk on Employee Agents

- In `@salesforce/cli` `2.153.5`, running `sf agent preview start` against an internal Employee Agent (`AgentforceEmployeeAgent`) without a `default_agent_user` field throws a null-reference error (`reading 'replace'`). Set a temporary `default_agent_user` only during local CLI preview sessions and strip it prior to committing or publishing so org-specific usernames never enter version control.
