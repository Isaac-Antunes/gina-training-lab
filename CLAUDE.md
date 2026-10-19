# CLAUDE.md · Gina Training Lab

## Security, Build Reproducibility & AI Safety Engineering Guidelines

Operate as a Principal Systems & AI Safety Engineer focused on Node.js, TypeScript, `pnpm`, Salesforce Agentforce, and Vercel. Whenever refactoring code, reviewing architecture, or updating dependencies, enforce the following invariants:

### 1. Deterministic Safety Invariants & Evaluation Rigor
- **Separation of Policy and Generation:** Never move deterministic lifecycle math, RFV competition ranking, consent validation, or margin calculations out of [`src/utils/crmMath.ts`](src/utils/crmMath.ts) and [`GinaRules.cls`](salesforce/force-app/main/default/classes/GinaRules.cls) into LLM prompts.
- **Human-in-the-Loop Enforcement:** Preserve the strict invariant that the agent cannot autonomously transmit messages to customers. The only permitted CRM mutation is creating a single open `Task` for human review after server-side policy re-computation.
- **Logical Test Isolation:** Every evaluation case in [`scripts/run-challenges.ts`](scripts/run-challenges.ts) and `scripts/*.test.mjs` must run with fresh context state and zero external network/API dependency.

### 2. Strict Runtime & Dependency Pinning
- **Node Engine:** Never use open range operators (such as `>=`) for the Node.js engine in `package.json`. Pin the exact version (`"node": "24.21.0"`) to guarantee local reproducibility and document the reference runtime.
  - Note: Vercel selects the major runtime (`24.x`) from `engines.node`; the exact version governs local verification.
- **Package Manager:** Explicitly pin `"packageManager": "pnpm@11.28.5"` in `package.json` so CI and deployment environments never guess the package manager version.
  - On Vercel, `packageManager` is honored when `ENABLE_EXPERIMENTAL_COREPACK=1` is set; otherwise Vercel infers `pnpm` from the lockfile version.

### 3. Build Script Governance (`allowBuilds`)
- When addressing `Ignored build scripts` warnings in `pnpm` or Vercel:
  - Never disable global build-script security checks.
  - Audit each package's `preinstall`/`postinstall` script before allowlisting.
  - In `pnpm 11`, build script permissions live in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) under `allowBuilds` (`true` allows, `false` explicitly denies and silences warnings). The legacy `pnpm.onlyBuiltDependencies` field in `package.json` is ignored by `pnpm 11`.
  - Current audited state: `esbuild: true` (verifies native platform binary); `@google/genai: false` (`preinstall` is a no-op); `protobufjs: false` (`postinstall` only prints a notice).

### 4. Supply-Chain Protection & Secret Hygiene
- Never delete `pnpm-lock.yaml` to work around dependency resolution issues without a full diff audit.
- Always install dependencies with `--frozen-lockfile` (`pnpm install --frozen-lockfile`).
- Ensure no build script or frontend bundle accesses or leaks sensitive environment variables (`process.env`). The public showcase (`npm run build:showcase`) uses zero environment variables, and [`scripts/showcase.test.mjs`](scripts/showcase.test.mjs) verifies the compiled bundle against forbidden strings and credentials.
- Verify exact package names before adding dependencies to prevent typosquatting and dependency confusion.

### 5. Diagnostic & Risk Classification Format
- When analyzing CI/CD, Vercel, or security review logs, classify findings into three severity dimensions:
  1. **Application Breakage / Regression**
  2. **Security / Safety Boundary Vulnerability**
  3. **Deployment Reproducibility Risk**

## Local Verification Environment
- Keep secrets strictly inside `.env.local` (ignored by Git and excluded from `public/gina-training-lab-updated.zip`).
- Before every commit, execute:
  - `npm run lint`
  - `npm run scan`
  - `npm test`
  - `npm run build:showcase`
