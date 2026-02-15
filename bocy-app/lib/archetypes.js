/**
 * Financial archetypes, sub-traits, strengths, and blind spots.
 */

export const ARCHETYPES = {
  subscription_collector: {
    key: 'subscription_collector',
    name: 'Subscription Collector',
    emoji: '📦',
    color: '#E8C872',
    vibe: 'You stack services like Pokémon cards — gotta subscribe to them all.',
    triggers: (m) => m.subscriptionCount >= 5,
    genPlaybook: (profile) => {
      const ct = profile.metrics.subscriptionCount;
      return `You're running ${ct} subscriptions. The average UK adult has 5. An audit could free up £${Math.round(profile.monthly.subscriptions * 0.3)}/month without noticing.`;
    },
  },
  convenience_seeker: {
    key: 'convenience_seeker',
    name: 'Convenience Seeker',
    emoji: '🚕',
    color: '#72B0E8',
    vibe: 'Time is your currency — you pay a premium for speed and ease.',
    triggers: (m) => m.foodDelivery > 50 || m.transport > 120,
    genPlaybook: (profile) => {
      const del = profile.monthly.foodDelivery;
      return `Delivery and transport costs hit £${Math.round(del + profile.monthly.transport)}/month. Batch-cooking and one car-free day a week could save £${Math.round((del + profile.monthly.transport) * 0.25)}/month.`;
    },
  },
  lifestyle_investor: {
    key: 'lifestyle_investor',
    name: 'Lifestyle Investor',
    emoji: '✨',
    color: '#B272E8',
    vibe: 'You invest in experiences and quality — life is for living.',
    triggers: (m) => m.shopping > 150 || m.eatingOut > 100,
    genPlaybook: (profile) => {
      const disc = profile.monthly.shopping + profile.monthly.eatingOut;
      return `£${Math.round(disc)}/month goes on lifestyle. You don't need to cut it all — redirecting 20% (£${Math.round(disc * 0.2)}) into a savings pot keeps the fun alive while building security.`;
    },
  },
  quiet_builder: {
    key: 'quiet_builder',
    name: 'Quiet Builder',
    emoji: '🧱',
    color: '#72E8B0',
    vibe: 'Slow and steady. Your savings rate puts you ahead of most.',
    triggers: (m) => m.savingsRate >= 20,
    genPlaybook: () =>
      "Your savings discipline is strong. The next step is making that money work harder — consider ISAs, index funds, or pension top-ups to beat inflation.",
  },
  edge_walker: {
    key: 'edge_walker',
    name: 'Edge Walker',
    emoji: '⚡',
    color: '#E87272',
    vibe: 'Living close to the wire. Every month is a tightrope.',
    triggers: (m) => m.savingsRate >= 0 && m.savingsRate < 5,
    genPlaybook: (profile) => {
      return `Your surplus is just £${Math.round(profile.monthly.surplus)}/month. One unexpected bill could tip you. Building even a £500 buffer should be priority one.`;
    },
  },
  debt_juggler: {
    key: 'debt_juggler',
    name: 'Debt Juggler',
    emoji: '🎪',
    color: '#E87272',
    vibe: 'Multiple debt accounts pulling in different directions.',
    triggers: (m) => m.debtAccountCount >= 3,
    genPlaybook: (profile) => {
      const ct = profile.metrics.debtAccountCount;
      return `${ct} active debt accounts detected. Consolidating or snowballing (smallest first) could simplify your finances and reduce interest. StepChange offers free UK debt advice.`;
    },
  },
  impulse_surfer: {
    key: 'impulse_surfer',
    name: 'Impulse Surfer',
    emoji: '🏄',
    color: '#72B0E8',
    vibe: 'You shop reactively — the algorithm knows your card number.',
    triggers: (m) => m.shopping > 200,
    genPlaybook: (profile) => {
      return `£${Math.round(profile.monthly.shopping)}/month on shopping suggests impulse patterns. A 24-hour rule on non-essential purchases over £30 could save 20-30%.`;
    },
  },
  comfort_spender: {
    key: 'comfort_spender',
    name: 'Comfort Spender',
    emoji: '☕',
    color: '#E8C872',
    vibe: 'Small treats add up — coffee, meals, little luxuries.',
    triggers: (m) => {
      const coffeeAndFood = (m.coffeeAndCafes || 0) + m.eatingOut;
      return coffeeAndFood > 80;
    },
    genPlaybook: (profile) => {
      return `The small stuff — coffees, lunches, impulse meals — adds up to more than most people think. Tracking just these for a week often reveals easy wins.`;
    },
  },
  side_hustler: {
    key: 'side_hustler',
    name: 'Side Hustler',
    emoji: '💼',
    color: '#72E8B0',
    vibe: 'Multiple income streams — you don\'t rely on one paycheck.',
    triggers: (_, profile) => {
      if (!profile || !profile.incomeSources) return false;
      return profile.incomeSources.length >= 2;
    },
    genPlaybook: (profile) => {
      const ct = profile.incomeSources.length;
      return `${ct} income sources detected. Diversification is smart — consider funnelling secondary income directly into savings or investments for maximum compound growth.`;
    },
  },
  balanced_realist: {
    key: 'balanced_realist',
    name: 'Balanced Realist',
    emoji: '⚖️',
    color: '#C8C8C8',
    vibe: 'Steady, moderate, no drama — the financial middle ground.',
    triggers: () => true, // fallback
    genPlaybook: () =>
      "Your spending is balanced and controlled. You're not making big mistakes — the opportunity now is optimisation: better rates, smarter savings vehicles, and compound growth.",
  },
};

export const SUB_TRAITS = {
  delivery_dependent: {
    name: 'Delivery-dependent',
    test: (m) => m.foodDelivery > 80,
    insight: 'Heavy delivery reliance adds a convenience tax to your food budget.',
  },
  credit_active: {
    name: 'Credit-active',
    test: (m) => m.creditCardCount >= 2,
    insight: 'Multiple credit lines increase risk of overspending.',
  },
  bnpl_user: {
    name: 'BNPL user',
    test: (m) => m.bnplCount >= 1,
    insight: 'Buy-now-pay-later can mask true spending. Track carefully.',
  },
  commuter: {
    name: 'Commuter',
    test: (m) => m.transport > 100,
    insight: 'Transport is a major fixed cost — explore season tickets or cycling.',
  },
  streaming_stacker: {
    name: 'Streaming stacker',
    test: (m) => m.streamingCount >= 3,
    insight: 'Multiple streaming services overlap. Rotate instead of stacking.',
  },
  grocery_premium: {
    name: 'Grocery premium',
    test: (m) => m.groceries > 350,
    insight: 'Grocery spend is above average — meal planning could yield savings.',
  },
  takeaway_regular: {
    name: 'Takeaway regular',
    test: (m) => m.eatingOut > 120,
    insight: 'Frequent eating out. Even one fewer meal out per week adds up.',
  },
  debt_servicing: {
    name: 'Debt-servicing',
    test: (m) => m.debtPayments > 200,
    insight: 'Significant debt payments. Prioritise high-interest balances.',
  },
  saver_mindset: {
    name: 'Saver mindset',
    test: (m) => m.savingsRate >= 15,
    insight: 'Strong savings habit — now optimise where that money sits.',
  },
  volatile_income: {
    name: 'Volatile income',
    test: (_, profile) => {
      if (!profile?.incomeSources) return false;
      return profile.incomeSources.some((s) => s.frequency === 'irregular');
    },
    insight: 'Irregular income makes budgeting harder — build a larger buffer.',
  },
};

export const STRENGTH_RULES = [
  { test: (m) => m.savingsRate >= 20, label: 'Strong saver', detail: 'Savings rate above 20% — top quartile.' },
  { test: (m) => m.subscriptionCount <= 3, label: 'Lean subscriptions', detail: 'Fewer than average subscriptions.' },
  { test: (m) => m.foodDelivery <= 30, label: 'Home cook', detail: 'Minimal delivery spend — well done.' },
  { test: (m) => m.debtAccountCount === 0, label: 'Debt-free', detail: 'No active debt accounts detected.' },
  { test: (m) => m.transport <= 60, label: 'Low transport costs', detail: 'Transport spending well controlled.' },
];

export const BLINDSPOT_RULES = [
  { test: (m) => m.subscriptionCount >= 7, label: 'Subscription creep', detail: 'High subscription count — audit recommended.' },
  { test: (m) => m.foodDelivery > 100, label: 'Delivery dependency', detail: 'Food delivery spending is high — convenience tax.' },
  { test: (m) => m.bnplCount >= 2, label: 'BNPL stacking', detail: 'Multiple BNPL plans can obscure true obligations.' },
  { test: (m) => m.savingsRate < 5, label: 'Thin margin', detail: 'Very little buffer — one shock away from difficulty.' },
  { test: (m) => m.debtAccountCount >= 3, label: 'Debt complexity', detail: 'Multiple debts increase cognitive and financial load.' },
];
