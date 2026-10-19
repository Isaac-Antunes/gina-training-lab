# Agent Instructions & Engineering Guidelines (`AGENTS.md`)

## 🎯 Primary Objective
Maintain, refactor, and evolve **Gina Training Lab (Gina Intell CRM)** to meet top-tier AI safety, systems engineering, and scientific evaluation standards (aligned with Anthropic Research Engineer / Safety & Systems evaluation criteria). Every contribution must preserve deterministic guarantees, empirical test reproducibility, strict credential hygiene, and clear, publication-grade technical English.

---

## 🧠 Architectural & AI Safety Core Principles
When modifying code, documentation, or agent workflows, preserve and highlight the repository's core safety and systems architecture:

1. **Deterministic Guardrails Over Probabilistic Outputs:**
   - Safety-critical and financial decisions—customer consent verification, opt-out enforcement, contact recency/rhythm math, 90-day dormancy windows, RFV competition-rank VIP tiers, and unit-margin validation—must **never** be delegated to probabilistic LLM token generation.
   - Always compute ground-truth state deterministically via [`src/utils/crmMath.ts`](src/utils/crmMath.ts) (Node/TypeScript) and [`GinaRules.cls`](salesforce/force-app/main/default/classes/GinaRules.cls) (Salesforce Apex) before invoking any language model.
   - Maintain **100% cross-runtime parity** between TypeScript and Apex implementations. Any change to decision thresholds (`1.5x` rhythm boundary, `3.0x` delay boundary, 3-ignored-contacts rule, top-third VIP cutoff) must be updated and verified in both runtimes.

2. **Bounded Action Space & Human-in-the-Loop (HITL) Oversight:**
   - The system has **zero autonomous external messaging capability**. Neither the Node backend nor the Salesforce Agentforce agent may send WhatsApp, SMS, or email messages directly to end customers.
   - The sole permitted write operation in CRM is creating an auditable review task (`Task` in Salesforce) assigned to the human store owner via `GinaService.createOwnerTask` / `src/integrations/salesforce/ownerTask.ts`.
   - **Server-Side Policy Re-Computation:** Task creation endpoints and Apex invocable actions must always re-compute the customer's eligibility from authoritative records rather than trusting client-supplied or model-supplied classifications, and must prevent duplicate open tasks.

3. **Fail-Closed Consent & Least-Privilege Data Access:**
   - Treat missing, unreadable, unverified, or contradicted consent (`authoritativeConsent: 'conflicted'`) as **revoked/absent**. Never default to permissive contact.
   - In Salesforce Apex, enforce `with sharing`, `WITH USER_MODE`, and `Security.stripInaccessible(AccessType.READABLE, ...)`. If field-level security (FLS) blocks access to `Gina_WhatsApp_Consent__c`, the system must fail closed and refuse outreach.

4. **Adversarial Robustness & Context Engineering:**
   - Untrusted customer fields and CRM notes must be sanitized through [`src/utils/contextEngineering.ts`](src/utils/contextEngineering.ts) before entering model context.
   - Preserve defenses against buried instruction hijacking ("lost-in-the-middle" overrides), zero-width and bidirectional Unicode smuggling (`U+200B`–`U+200F`, `U+202A`–`U+202E`, `U+E0000` tags), external Markdown tracking images, and privilege escalation via injected JSON keys (`isVipTier`, `bypassConsent`, `expectedAction`).

---

## 🛠️ Tech Stack & Environment
- **Runtime / Language:** Node.js (`24.21.0` pinned), TypeScript (`7.0.2`), React 19, HTML5, Vite 8.
- **Package Manager:** `pnpm@11.28.5` (strictly enforced via `package.json` and `pnpm-workspace.yaml`).
- **CRM & Agent Integration:** Salesforce DX / Agentforce 2GP Managed Package (`salesforce/`, namespace `ginaintell`, API `v66.0`).
- **Deployment Target:** Vercel (`https://gina-intell.vercel.app/`).

---

## 🔒 Security & Strict Guardrails (CRITICAL)
1. **Zero Hardcoded Secrets:**
   - Never hardcode API keys (`GEMINI_API_KEY`, `CLAUDE_API_KEY`), Salesforce access/refresh tokens, SFDX auth URLs, or personal org usernames/credentials in code, tests, or documentation.
   - Scrub any real identifiers in documentation and replace them with canonical placeholders (`YOUR_API_KEY`, `04t000000000000AAA`, `example.com`).
2. **Environment & Bundle Protection:**
   - Keep `.env`, `.env.local`, `.sf/`, and `.sfdx/` strictly ignored in `.gitignore` and excluded from source archives in [`scripts/package-source.mjs`](scripts/package-source.mjs).
   - Ensure the public showcase build (`vite.showcase.config.ts`) never references runtime environment variables, internal prompts, or backend API routes (verified by [`scripts/showcase.test.mjs`](scripts/showcase.test.mjs)).
3. **Network & Supply-Chain Safety:**
   - Keep the local Express server ([`server.ts`](server.ts)) bound exclusively to loopback (`127.0.0.1`) with `hostGuard` middleware active before all routes.
   - Validate all Salesforce record IDs against strict 15/18-character alphanumeric format (`isContactId`) prior to constructing SOQL queries.
   - Install dependencies with `--frozen-lockfile`. Never enable arbitrary `postinstall` scripts; manage `allowBuilds` explicitly in `pnpm-workspace.yaml`.

---

## 📂 Repository Hygiene & Asset Organization
- **Root Directory:** Keep the root clean. Only core configuration files (`package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.json`, `vite*.config.ts`, `vercel.json`, `metadata.json`), `server.ts`, entry HTML files (`index.html`, `showcase.html`, `en.html`), and top-level markdown documentation (`README.md`, `AGENTS.md`, `CLAUDE.md`, `VALIDACAO.md`) belong in the root.
- **Assets:** Store all design studies, diagrams, brand mockups (`.png`, `.svg`), and source design binaries (`.psd`) inside `docs/assets/` using clean, lowercase kebab-case filenames without spaces or colons.
- **Build Artifacts:** Never commit `node_modules/`, `dist/`, `dist-showcase/`, or generated `.zip` archives.
- **Localization:** Write all documentation, code comments, commit messages, and pull request descriptions in clear, rigorous technical English. (Note: intentional Portuguese domain fixtures and UI strings tested by the evaluation suite in `src/` and `scripts/*.test.mjs` must remain intact so all unit and parity tests pass.)

---

## 🚀 Key Commands & Verification Protocol
Before proposing or committing any change, run the full local verification suite (requires zero external API calls):

- **Install dependencies:** `pnpm install --frozen-lockfile`
- **Typecheck (TypeScript):** `npm run lint`
- **Prompt-injection & Unicode static scan:** `npm run scan`
- **Package source archive check:** `npm run package:source`
- **Full evaluation & unit test suite (47 domain/security cases + integration tests):** `npm test`
- **Public showcase build verification:** `npm run build:showcase`
