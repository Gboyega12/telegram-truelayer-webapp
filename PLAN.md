# Implementation Plan: Financial Decision Assistant Engine

## Overview
Transform BOCY from a spending report card into a financial decision assistant. All changes are in `index.html` — no backend changes needed. The data is already there; we're extracting intelligence from it.

## What changes

### 1. Decision Quality Score (new method: `calcDecisionScore`)
**Location:** New method on `EnrichmentEngine`, called from `enrich()`

Computes a 0-100 score from 5 weighted dimensions:
- **Intentionality (25%)** — What % of spending is habitual/recurring vs one-off intentional? High ratio of recurring = lower score. Uses `detectRecurring` output + subscription count.
- **Debt efficiency (20%)** — Debt payments as % of income. 0 debt = full marks. >30% = 0.
- **Savings capacity (25%)** — Savings rate vs 20% target. Scaled linearly.
- **Subscription utilisation (15%)** — Subscriptions with consistent usage (3+ transactions in related categories) vs dormant ones (only the subscription charge itself).
- **Convenience premium (15%)** — Food delivery + transport premium as % of total spending. Lower = better.

Output: `{ score: 68, verdict: "You earn well but £340/mo is leaking to habits you're not actively choosing", breakdown: [{dimension, score, detail}] }`

### 2. Decision Stack — Top Money Moves (new method: `genDecisionStack`)
**Location:** New method on `EnrichmentEngine`, called from `enrich()`

Analyzes all spending and generates a ranked list of specific actions. Each action has:
- `action`: specific instruction ("Cancel Audible — unused for 8+ weeks")
- `annualImpact`: exact £ saved per year
- `effort`: 'low' | 'medium' | 'high'
- `unlocks`: what this enables ("Clears Klarna 6 weeks faster")

**Decision types to detect:**

a) **Dormant subscriptions** — subscriptions where the charge interval suggests active billing but frequency is low (≤1-2 charges in data window) or no recent charge in last 60 days despite being recurring. Impact = annual cost.

b) **Hidden subscriptions** — non-subscription merchants that appear with subscription-like regularity (e.g. Pret 19x/month). Surface as "hidden £X/mo subscription" with a "reduce by N visits" action.

c) **Convenience swaps** — food delivery spend that could be partially replaced. Calculate: if user has grocery spending too, suggest ratio shift. "Swap 2 Deliveroo orders/week for home cooking → save £X/mo." Use actual average order value from their data.

d) **Debt acceleration** — if multiple debts exist, compute optimal payoff order (smallest balance first for quick wins). "Clear [smallest debt] in X months, then redirect £Y/mo to [next debt]."

e) **Spending pattern breaks** — if payday splurge detected (see behavioral patterns), quantify: "Your first-3-days spending is £X above your daily average. Delaying non-essential purchases by 48 hours could save £Y/mo."

**Ranking:** `annualImpact / effortMultiplier` where low=1, medium=2, high=3. Show top 3.

### 3. Archetype Playbooks (modify `ARCHETYPES`)
**Location:** Replace `genMoneyStory` on each archetype with `genPlaybook`

Each archetype gets a `genPlaybook(profile)` function that returns:
- `narrative`: 2-3 sentence personality-aware framing (keeps the current vibe)
- `strategies[]`: 2-3 specific strategies tailored to HOW this personality type behaves

Examples:
- **Convenience Seeker**: strategies framed as "same convenience, lower cost" swaps
- **Impulse Surfer**: strategies framed as "add friction" (24hr rule, remove saved cards)
- **Debt Juggler**: strategies framed as "sequenced payoff plan" using their actual debts
- **Quiet Builder**: strategies framed as "optimise what's already working" (better rates, investment growth)
- **Subscription Collector**: strategies framed as "audit and rotate" (cancel, trial alternatives)

The playbook uses actual numbers from the profile — not generic advice.

### 4. Behavioral Patterns (new method: `detectBehavioralPatterns`)
**Location:** New method on `EnrichmentEngine`, called from `enrich()`

Analyzes transaction TIMING to surface patterns:

a) **Payday splurge** — Find the dominant income day (day of month with most credits). Compute average daily spend in days 1-3 after payday vs rest of month. If >1.5x, flag it with the £ premium.

b) **Weekend premium** — Compare Sat+Sun average daily spend vs Mon-Fri. If >1.3x, flag.

c) **Hidden subscriptions** — Merchants appearing 8+ times in data with regular intervals but NOT flagged isSubscription. e.g. "Pret 19 times = ~£65/mo hidden subscription."

d) **Late-month squeeze** — If spending drops significantly in last 5 days before payday, flag: "Your spending drops X% in the last week before payday — a sign of cash flow pressure."

e) **Category clustering** — If 3+ shopping transactions happen within 24 hours, flag as "impulse cluster" with total £ amount.

Output: `[{ pattern: 'payday_splurge', text: 'You spend 2.4x more in the 3 days after payday', detail: '£X above your daily average', severity: 'high' }]`

Show top 3 most significant patterns.

### 5. Compound Cost Engine (new method: `calcCompoundCost`)
**Location:** New method on `EnrichmentEngine`, called from `enrich()`

For the top 3 discretionary spending categories (excluding bills, debt, rent, groceries — things you can't easily cut), compute:
- Annual cost (already have this)
- 5-year compound cost at 7% market returns
- 10-year compound cost at 7% market returns

Formula: `FV = PMT × (((1 + r)^n - 1) / r)` where r = 0.07/12, n = months, PMT = monthly spend.

Output: `[{ category: 'Food Delivery', monthly: 68, annual: 816, fiveYear: 5670, tenYear: 14180 }]`

### 6. Updated Result Component
**Location:** Modify the `Result` React component

New section order (after personality card):

```
1. ResultCard (personality card — unchanged, still shareable)
2. DecisionScore (new component — score circle + verdict + 5-dimension breakdown)
3. MoneyMoves (new component — top 3 decision stack cards)
4. Playbook (replaces Money Story — archetype narrative + strategies)
5. BehavioralPatterns (new component — pattern cards)
6. CompoundCost (new component — replaces flat savings breakdown)
7. [email gate] — blind spots, strengths, peer comparison, spending trend remain gated
```

Each new component is a `const` functional component defined above `Result`.

### 7. Data Flow Changes

The `enrich()` method return value expands:
```js
return {
  profile, archetype, traits, strengths, blindSpots,
  peerComparison, insights, potentialSavings,
  // NEW:
  decisionScore,      // from calcDecisionScore(profile)
  decisionStack,      // from genDecisionStack(profile, recurring)
  playbook,           // from archetype.genPlaybook(profile)
  behavioralPatterns, // from detectBehavioralPatterns(enriched)
  compoundCosts,      // from calcCompoundCost(profile)
  subscriptions: profile.subscriptions,
  enrichedTransactions: enriched
};
```

## Implementation Order

1. `detectBehavioralPatterns` — needs raw transaction dates, so build first while enriched txs are accessible
2. `calcDecisionScore` — depends on profile, straightforward computation
3. `genDecisionStack` — the core intelligence; depends on profile + recurring + behavioral patterns
4. `calcCompoundCost` — simple math on profile.monthly
5. Archetype `genPlaybook` functions — modify each ARCHETYPE entry
6. Result component UI — wire up all new data into new sections
7. Remove deprecated sections (old insights, old savings breakdown, old money story)

## What we're NOT changing
- Enrichment pipeline (MERCHANT_DB, Claude categorisation, CSV parsing) — just improved these
- Backend (api/claude/enrich.js, api/truelayer/callback.js)
- Landing page, upload flow, email capture, share functionality
- The personality card itself (it's the shareable hook)
