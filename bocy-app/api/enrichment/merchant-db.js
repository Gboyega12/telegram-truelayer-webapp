// Server-side copy of merchant-db for API enrichment
// See lib/merchant-db.js for the canonical version

const MERCHANTS = [
  { patterns: ['tesco'], merchant: 'Tesco', category: 'Groceries' },
  { patterns: ['sainsbury'], merchant: "Sainsbury's", category: 'Groceries' },
  { patterns: ['asda'], merchant: 'Asda', category: 'Groceries' },
  { patterns: ['aldi'], merchant: 'Aldi', category: 'Groceries' },
  { patterns: ['lidl'], merchant: 'Lidl', category: 'Groceries' },
  { patterns: ['waitrose'], merchant: 'Waitrose', category: 'Groceries' },
  { patterns: ['morrisons'], merchant: 'Morrisons', category: 'Groceries' },
  { patterns: ['deliveroo'], merchant: 'Deliveroo', category: 'Food Delivery' },
  { patterns: ['uber eats', 'ubereats'], merchant: 'Uber Eats', category: 'Food Delivery' },
  { patterns: ['just eat'], merchant: 'Just Eat', category: 'Food Delivery' },
  { patterns: ['netflix'], merchant: 'Netflix', category: 'Subscriptions', isSubscription: true },
  { patterns: ['spotify'], merchant: 'Spotify', category: 'Subscriptions', isSubscription: true },
  { patterns: ['amazon prime'], merchant: 'Amazon Prime', category: 'Subscriptions', isSubscription: true },
  { patterns: ['amazon', 'amzn'], merchant: 'Amazon', category: 'Shopping' },
  { patterns: ['klarna'], merchant: 'Klarna', category: 'BNPL', isBNPL: true },
  { patterns: ['salary', 'wages', 'payroll'], merchant: 'Salary', category: 'Income', isIncome: true },
];

function matchMerchant(description) {
  const lower = description.toLowerCase().trim();
  for (const entry of MERCHANTS) {
    for (const pattern of entry.patterns) {
      if (lower.includes(pattern)) {
        return {
          merchant: entry.merchant,
          category: entry.category,
          isSubscription: entry.isSubscription || false,
          isBNPL: entry.isBNPL || false,
          isIncome: entry.isIncome || false,
        };
      }
    }
  }
  return null;
}

module.exports = { matchMerchant, MERCHANTS };
