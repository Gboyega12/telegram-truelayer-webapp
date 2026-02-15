# BOCY — Webapp Plan

## What this is

BOCY Money Personality as a simple web app. One HTML file, two serverless functions, deployed on Vercel. No database, no React Native, no Expo, no mobile app complexity.

Users connect their bank (TrueLayer) or upload a statement (CSV/PDF), get their money personality analysis instantly, and that's it.

## Architecture

```
index.html          — entire frontend (React via CDN, no build step)
api/
  truelayer/
    callback.js     — exchanges OAuth code for transactions
  claude/
    enrich.js       — proxies AI categorisation requests
vercel.json         — routes API calls, serves SPA
```

**That's the whole app.** No frameworks, no node_modules in production, no build pipeline.

## What exists today

The `index.html` already contains a working product:
- Landing page with bank connect + file upload options
- TrueLayer OAuth flow (connect bank → fetch transactions)
- CSV and PDF parsing for manual uploads
- Local merchant database (118 UK merchants)
- AI-assisted categorisation via Claude (fallback for unknown merchants)
- Enrichment engine that builds a financial profile
- 7 money personality archetypes with rules-based matching
- Result card (shareable), insights, peer comparison, savings estimates
- Email waitlist capture (Google Sheets)

The two serverless functions handle the only server-side work:
- `/api/truelayer/callback` — OAuth token exchange + transaction fetch
- `/api/claude/enrich` — proxies enrichment requests to Anthropic

## What needs to happen

### 1. Clean up the repo
- Remove `bocy-app/` (Expo/React Native — no longer needed)
- Remove root `package.json` build scripts that reference bocy-app
- Simplify `vercel.json` to just serve `index.html` + API routes
- Keep `api/` folder as-is

### 2. Verify the webapp deploys cleanly
- `index.html` served at root
- API routes work (`/api/truelayer/callback`, `/api/claude/enrich`)
- TrueLayer OAuth redirect works end-to-end
- File upload (CSV + PDF) works

### 3. Keep it simple
- All frontend code stays in `index.html`
- No build step, no bundler, no framework migration
- Libraries via CDN (React 18, Babel, PDF.js, html2canvas)
- Zero npm dependencies in production

## Environment variables (Vercel)

```
TRUELAYER_CLIENT_SECRET  — for OAuth token exchange
CLAUDE_API_KEY           — for AI enrichment proxy
```

## Future (not now)

The old PLAN.md had ideas for Decision Score, Money Moves, Behavioral Patterns, Compound Cost Engine, etc. Those are good features but they come later — after the basic webapp is solid and deployed.

Priority order when we get there:
1. Behavioral pattern detection (payday splurge, weekend premium, hidden subscriptions)
2. Decision score (0-100 financial health metric)
3. Actionable money moves (ranked by impact/effort)
4. Compound cost visualisation
5. Archetype-specific playbooks

But first: ship the clean webapp.
