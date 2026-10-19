# Agent Instructions & Workflow Policy (`AGENTS.md`)

## 🛡️ Core Directives for Agents
1. **Security & Sanitization First:** 
   - Never expose, copy, or commit real API keys, `.env` files, refresh tokens, or Salesforce credentials from this private repository into any public output or public repository (`gina-training-lab`).
   - Scrub all credentials, replacing them with generic placeholders (e.g., `YOUR_KEY_HERE`, `example.com`).
2. **Scope of Work:**
   - Focus strictly on code improvements, UI refinements, and architectural enhancements.
   - Ensure all documentation, code comments, and commit messages are written in clear, professional technical English.
3. **Build & Quality Control:**
   - Use `pnpm` for package management.
   - Run tests and verify the build locally (`pnpm install`) before proposing or pushing any modifications.
