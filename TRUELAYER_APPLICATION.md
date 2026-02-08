# BOCY Money Personality — TrueLayer Application

## 1. What BOCY Does

BOCY Money Personality is a consumer financial wellness tool. It analyses a user's bank transaction history and determines their "money personality archetype" — a behavioural profile that describes how they spend, save, and manage money.

The product gives users a clear, jargon-free picture of their financial habits: which subscriptions they are paying for, how their spending compares to UK averages, where they could save money, and what their behavioural tendencies are.

There are seven archetypes (e.g. "The Subscription Collector", "The Quiet Builder", "The Edge Walker"), each determined by analysing real transaction patterns across categories like subscriptions, food delivery, debt payments, transport, and savings.

Users can access the tool at our web app hosted on Vercel. They either connect their bank via TrueLayer or upload a bank statement (CSV or PDF). The analysis runs instantly and the results are displayed on screen — no account creation required.

### Why we need TrueLayer

TrueLayer gives our users the simplest, most accurate way to share their transaction history. Rather than downloading and uploading a bank statement (which many users find confusing), they can securely connect their bank with a few taps. This is especially important on mobile, where the majority of our users interact with BOCY.

Open Banking via TrueLayer also provides cleaner, more structured data than PDF or CSV uploads, which leads to more accurate categorisation and a better user experience.


## 2. How the Integration Works

### User Journey

1. User lands on the BOCY web app and taps "Get Started"
2. They are presented with two options: "Connect Your Bank" (recommended) or "Upload a Statement"
3. If they choose to connect their bank, they are redirected to TrueLayer's authorisation page
4. The user selects their bank, logs in with their own banking credentials, and consents to share transaction data
5. TrueLayer redirects back to our app with an authorisation code
6. Our backend exchanges this code for an access token, fetches up to 12 months of transactions, and returns them to the frontend
7. The frontend enrichment engine categorises every transaction and builds the user's personality profile
8. Results are displayed immediately — no data is stored

### Technical Flow

**Frontend (index.html)**
- Single-page React application
- Initiates the TrueLayer OAuth flow by redirecting to `auth.truelayer.com` with our client ID, requested scopes (`info accounts balance transactions cards`), and the redirect URI
- On return, captures the `?code=` parameter from the URL, cleans the URL, and sends the code to our backend

**Backend (api/truelayer/callback.js)**
- Vercel serverless function (Node.js)
- Receives the authorisation code from the frontend via POST request
- Exchanges the code for an access token at `auth.truelayer.com/connect/token` using our client ID and client secret
- Fetches the user's accounts and cards from TrueLayer's Data API (`api.truelayer.com/data/v1/`)
- For each account and card, fetches transactions for the past 12 months
- Converts the TrueLayer transaction format into a simple CSV structure (Date, Description, Amount)
- Returns the CSV and transaction count to the frontend
- The access token is used only during this single request and is never stored

### Scopes Requested

| Scope | Purpose |
|-------|---------|
| `info` | Basic account holder information |
| `accounts` | List of bank accounts |
| `balance` | Account balances (for savings rate calculation) |
| `transactions` | Transaction history (core data for analysis) |
| `cards` | Credit and debit card accounts |

### Data Accessed

We fetch transaction data from both current accounts and card accounts. For each transaction, we use:
- **timestamp** — to identify recurring patterns and date-based trends
- **description / merchant_name** — to identify and categorise the merchant
- **amount** — to calculate spending totals and category breakdowns
- **transaction_type** — to distinguish debits from credits


## 3. How We Process the Data

Once transaction data arrives at the frontend, it passes through our four-step enrichment pipeline:

### Step 1: Parse
The CSV data (from TrueLayer or file upload) is parsed into structured transaction objects with date, description, and amount fields.

### Step 2: Local Merchant Identification
Each transaction is matched against our local merchant database — a curated list of 118 UK merchant patterns covering subscriptions (Netflix, Spotify, PureGym), groceries (Tesco, Sainsbury's), food delivery (Deliveroo, Uber Eats), transport (TfL, Uber), debt payments (Klarna, Barclaycard), and more.

Each merchant pattern has a strict `isSubscription` flag. Only genuine recurring subscription services are flagged as subscriptions — a Tesco purchase is categorised as Groceries, not a subscription, even if it happens weekly.

### Step 3: AI Confirmation (Final Layer)
Transactions that could not be matched locally (categorised as "Other") are sent in batches to a Claude AI model (Anthropic's Claude Haiku) for categorisation. This happens via our own backend proxy (`api/claude/enrich.js`) — the AI API key is stored as a server-side environment variable and is never exposed to the browser.

The AI returns a merchant name, category, and subscription flag for each uncertain transaction. This step significantly improves accuracy for lesser-known merchants and unusual transaction descriptions.

### Step 4: Profile Building
The enriched transactions are analysed to produce:
- **Recurring payment detection** — identifies subscriptions and debt payments by analysing transaction frequency and amount consistency
- **Category spending totals** — monthly breakdown across Subscriptions, Groceries, Food Delivery, Shopping, Transport, Bills, Eating Out, Entertainment, Debt Payments
- **Financial metrics** — savings rate, subscription count, debt account count, credit card count, BNPL count
- **Archetype determination** — rules-based matching against our seven archetype profiles
- **Peer comparison** — benchmarked against UK averages for subscriptions, food delivery, and savings
- **Personalised insights** — specific, actionable observations about the user's spending patterns
- **Potential savings estimate** — calculated based on subscription optimisation, delivery reduction, and debt management opportunities


## 4. Data Management and Privacy

### We do not store user data

This is the most important thing to understand about BOCY's data handling: **we do not persist any user transaction data**. There is no database. There are no user accounts. There is no login system.

Here is exactly what happens to the data:

1. **TrueLayer access token** — used in a single serverless function invocation to fetch transactions, then discarded. The function is stateless; when it finishes executing, the token ceases to exist in memory.

2. **Transaction data** — fetched from TrueLayer, converted to CSV format, and returned to the user's browser in a single HTTP response. The serverless function does not write to any database, file system, or external storage.

3. **Browser-side data** — the transaction data and analysis results exist only in the browser's memory (React state). When the user closes the tab or navigates away, it is gone. We do not use localStorage, sessionStorage, IndexedDB, or cookies to store transaction data.

4. **AI enrichment** — when uncertain transactions are sent to Claude for categorisation, only the merchant description and amount are sent (no account numbers, no dates, no personally identifiable information). The AI provider (Anthropic) does not retain API request data for model training.

### What we do collect

The only data we collect is an optional email address at the end of the experience, if the user chooses to join our waitlist. This is sent to a Google Sheets endpoint and contains:
- Email address
- Archetype name (e.g. "The Subscription Collector")
- Summary metrics (savings rate, subscription count)
- Timestamp

This is entirely opt-in and contains no transaction-level data.


## 5. Security Practices

### Secrets Management
- **TrueLayer client secret** — stored as a Vercel environment variable (`TRUELAYER_CLIENT_SECRET`). Never present in source code or client-side JavaScript.
- **Claude API key** — stored as a Vercel environment variable (`CLAUDE_API_KEY`). Accessed only by the server-side proxy function.
- No API keys, tokens, or credentials are ever sent to the browser.

### Server-Side Architecture
- Backend consists of two Vercel serverless functions:
  - `/api/truelayer/callback` — handles the OAuth token exchange and data fetching
  - `/api/claude/enrich` — proxies AI enrichment requests
- Both functions are stateless. They process a request and return a response. No data persists between invocations.
- Both functions validate HTTP method (POST only) and required parameters before processing.

### Client-Side Security
- The frontend is a single HTML file with no build toolchain, no node_modules, and no dependency supply chain risk.
- External libraries are loaded from versioned CDN URLs (React 18, Babel, PDF.js 3.11.174, html2canvas).
- No user data is written to local storage, cookies, or any browser persistence mechanism.
- The TrueLayer redirect URI is centralised in a single configuration object to prevent mismatch vulnerabilities.

### Network Security
- All external API calls use HTTPS exclusively (TrueLayer auth, TrueLayer data API, Anthropic API).
- The Vercel deployment enforces HTTPS for all incoming requests.
- CORS headers are set on serverless functions to control cross-origin access.

### OAuth Implementation
- We use the standard OAuth 2.0 authorisation code flow as specified by TrueLayer.
- The authorisation code is exchanged for an access token server-side — the client secret never touches the browser.
- Access tokens are used immediately and not stored.
- The redirect URI is validated to match exactly what is registered with TrueLayer.


## 6. Code Quality

### Architecture
The application follows a deliberately simple architecture:
- **One HTML file** (`index.html`) — contains the complete frontend: React components, enrichment engine, merchant database, archetype definitions, and styling
- **Two serverless functions** — one for TrueLayer OAuth/data, one for AI enrichment
- **One routing config** (`vercel.json`) — separates API routes from the SPA

This simplicity is intentional. There is no framework overhead, no build process that could introduce vulnerabilities, and the entire codebase can be audited in under 30 minutes.

### Error Handling
- Every external API call (TrueLayer token exchange, account fetching, transaction fetching, AI enrichment) has explicit error handling with try/catch blocks.
- Transaction fetching uses `Promise.all` with individual `.catch()` handlers so that a failure on one account does not prevent others from being processed.
- The AI enrichment step degrades gracefully — if Claude is unavailable, transactions remain with their local categorisation. The feature is an enhancement, not a dependency.
- The frontend displays clear, user-friendly error messages for connection failures and suggests the file upload alternative.

### Input Validation
- The TrueLayer callback function validates that both `code` and `redirect_uri` are present before proceeding.
- The Claude proxy function validates that a `prompt` is present before making the API call.
- CSV parsing handles multiple date formats (DD/MM/YYYY, YYYY-MM-DD, natural language dates), quoted fields, and missing columns gracefully.
- PDF parsing limits processing to 30 pages maximum to prevent resource exhaustion.

### Dependency Footprint
The application has zero npm dependencies. The serverless functions use only Node.js built-in APIs (`fetch`, `URLSearchParams`). Frontend libraries are loaded from CDN:
- React 18 (production build)
- Babel standalone (for JSX transformation)
- PDF.js 3.11.174 (for client-side PDF parsing)
- html2canvas (for shareable result card generation)


## 7. Compliance and Regulatory Context

### Data Protection (UK GDPR / Data Protection Act 2018)
- We minimise data collection — we only access what is needed for the analysis and discard it immediately.
- No personal data is stored on our servers.
- The only persisted data (optional waitlist email) is clearly disclosed and consent-based.
- Transaction data sent to the AI enrichment layer is stripped of personally identifiable information — only merchant descriptions and amounts are shared.

### Consumer Duty
- BOCY is designed to help consumers understand their financial habits. The insights are educational, not advisory.
- We do not sell financial products, recommend specific providers, or earn commission from any financial institution.
- The experience is free, transparent, and designed to be genuinely useful.

### Open Banking
- We access data through TrueLayer's regulated Open Banking infrastructure.
- Users explicitly consent to data sharing through their bank's own authorisation flow.
- We request only the scopes necessary for our analysis (transactions, accounts, cards, balance, info).
- Access tokens are not stored or refreshed — each session is a one-time data access.


## 8. Summary

BOCY Money Personality is a lightweight, privacy-first financial wellness tool that:

- Uses TrueLayer Open Banking to give users the simplest way to share their transaction history
- Analyses up to 12 months of transactions across bank accounts and cards
- Categorises spending using a local merchant database enhanced by AI confirmation
- Determines one of seven behavioural money personality archetypes
- Provides personalised insights, peer comparisons, and savings estimates
- **Stores no user data** — all processing happens in-memory during a single session
- Keeps all secrets server-side in environment variables
- Degrades gracefully when any external service is unavailable
- Is built with a minimal, auditable codebase with zero npm dependencies

We believe BOCY demonstrates a responsible, consumer-friendly use of Open Banking that aligns with TrueLayer's mission to make financial data work for end users.

---

**Application:** BOCY Money Personality
**Client ID:** bocymoneypersonality-a01ae4
**Website:** bocy.io
**Hosting:** Vercel
**Contact:** [Your contact email]
