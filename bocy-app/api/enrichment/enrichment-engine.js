// Server-side enrichment engine for API use
// See lib/enrichment-engine.js for the canonical client-side version

const MERCHANT_DB = require('./merchant-db');
const { ARCHETYPES, ESSENTIAL_CATEGORIES, UK_BENCHMARKS, SUB_TRAITS, STRENGTH_RULES, BLINDSPOT_RULES } = require('./archetypes');

const EnrichmentEngine = {
  enrich(rawCSV) {
    const transactions = this.parseCSV(rawCSV);
    const enriched = transactions.map((tx) => this.enrichTransaction(tx));
    const profile = this.buildProfile(enriched);
    return { profile, enrichedTransactions: enriched };
  },

  parseCSV(raw) {
    const lines = raw.trim().split('\n');
    if (lines.length < 2) return [];
    const transactions = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 3) continue;
      const date = new Date(parts[0]);
      const description = parts[1]?.trim();
      const amount = parseFloat(parts[2]) || 0;
      if (description && amount !== 0 && !isNaN(date.getTime())) {
        transactions.push({ date, description, amount });
      }
    }
    return transactions;
  },

  enrichTransaction(tx) {
    const match = MERCHANT_DB.matchMerchant(tx.description);
    return {
      ...tx,
      merchant: match?.merchant || tx.description,
      category: match?.category || (tx.amount > 0 ? 'Income' : 'Other'),
      isSubscription: match?.isSubscription || false,
      isIncome: match?.isIncome || tx.amount > 0,
    };
  },

  buildProfile(transactions) {
    const spending = transactions.filter((t) => t.amount < 0);
    const income = transactions.filter((t) => t.amount > 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);
    const totalSpending = Math.abs(spending.reduce((s, t) => s + t.amount, 0));
    return {
      monthly: { income: totalIncome, spending: totalSpending, surplus: totalIncome - totalSpending },
      transactionCount: transactions.length,
    };
  },
};

module.exports = EnrichmentEngine;
