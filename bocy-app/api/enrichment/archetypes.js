// Server-side copy of archetypes for API enrichment
// See lib/archetypes.js for the canonical version

const ARCHETYPES = {
  subscription_collector: { key: 'subscription_collector', name: 'Subscription Collector', emoji: '📦', color: '#E8C872' },
  convenience_seeker: { key: 'convenience_seeker', name: 'Convenience Seeker', emoji: '🚕', color: '#72B0E8' },
  lifestyle_investor: { key: 'lifestyle_investor', name: 'Lifestyle Investor', emoji: '✨', color: '#B272E8' },
  quiet_builder: { key: 'quiet_builder', name: 'Quiet Builder', emoji: '🧱', color: '#72E8B0' },
  edge_walker: { key: 'edge_walker', name: 'Edge Walker', emoji: '⚡', color: '#E87272' },
  debt_juggler: { key: 'debt_juggler', name: 'Debt Juggler', emoji: '🎪', color: '#E87272' },
  impulse_surfer: { key: 'impulse_surfer', name: 'Impulse Surfer', emoji: '🏄', color: '#72B0E8' },
  comfort_spender: { key: 'comfort_spender', name: 'Comfort Spender', emoji: '☕', color: '#E8C872' },
  side_hustler: { key: 'side_hustler', name: 'Side Hustler', emoji: '💼', color: '#72E8B0' },
  balanced_realist: { key: 'balanced_realist', name: 'Balanced Realist', emoji: '⚖️', color: '#C8C8C8' },
};

const ESSENTIAL_CATEGORIES = new Set(['Bills', 'Groceries', 'Transport', 'Health', 'Education', 'Debt Payments']);

const UK_BENCHMARKS = {
  subscriptions: { count: 5, monthly: 52 },
  foodDelivery: 68,
  savingsRate: 11,
};

const SUB_TRAITS = {};
const STRENGTH_RULES = [];
const BLINDSPOT_RULES = [];

module.exports = { ARCHETYPES, ESSENTIAL_CATEGORIES, UK_BENCHMARKS, SUB_TRAITS, STRENGTH_RULES, BLINDSPOT_RULES };
