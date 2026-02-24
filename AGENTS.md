# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

React + Vite + TypeScript PWA todo app backed by Supabase. See `README.md` for setup steps.

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Vite dev server | `npm run dev` | 3000 | Frontend; proxies `/api/*` to port 3001 |
| Storybook | `npm run storybook` | 6006 | Component development/visual testing |
| Vercel dev (API) | `npm run dev:api` | 3001 | Requires `vercel` CLI; optional for frontend-only work |
| Both (frontend + API) | `npm run dev:all` | 3000 + 3001 | Uses `concurrently` |

### Key commands

- **Build:** `npm run build`
- **Tests:** `npx vitest run` (runs Storybook browser tests via Playwright/Chromium)
- **Lint:** No ESLint config exists; use `npx tsc --noEmit` for type-checking (requires adding a `tsconfig.json`)

### Non-obvious caveats

- The app requires Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in a `.env` file. Without valid credentials, the frontend renders the sign-in page but auth calls fail with "Failed to fetch". The Supabase client code (`src/lib/supabase.ts`) gracefully falls back to a placeholder client.
- **Env var gotcha:** Vite reads `VITE_*` vars from both the `.env` file and the process environment. If secrets are injected as shell env vars with key=value prefixes (e.g. `VITE_SUPABASE_URL=SUPABASE_URL=https://...`), Vite will use the malformed value. Fix by stripping prefixes before starting Vite, or pass cleaned values inline: `VITE_SUPABASE_URL="$CLEAN_URL" npx vite`.
- The "Skip sign-in (dev only)" button uses `supabase.auth.signInAnonymously()`. Anonymous auth must be enabled in the Supabase project settings for this to work.
- Vitest tests use `@storybook/addon-vitest` with Playwright's Chromium browser. Run `npx playwright install chromium` if Chromium is not cached.
- There is no `tsconfig.json` committed; Vite handles TypeScript transpilation directly. Type-checking would require creating one.
- The `vite-parse-voice-plugin.ts` adds a local middleware for `/api/parse-voice-task` during dev, loading `.env.local` for `OPENAI_API_KEY`. Other API routes are proxied to the Vercel dev server on port 3001.
- Storybook's `main.js` filters out PWA and parse-voice plugins to avoid build issues in the Storybook context.
