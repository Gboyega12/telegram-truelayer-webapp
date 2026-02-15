// Bocy Archetypes — money personality definitions, traits, rules, and benchmarks
// Ported from web app

const UK_BENCHMARKS = { subscriptions: { count: 5, monthly: 52 }, foodDelivery: 68, savingsRate: 11 };

// Essential/non-discretionary categories — for behavioral pattern analysis
const ESSENTIAL_CATEGORIES = new Set(['Bills', 'Groceries', 'Transport', 'Health', 'Education', 'Debt Payments']);

// ARCHETYPES — 10 distinct money personalities
const ARCHETYPES = {
  subscription_collector: {
    name: 'The Subscription Collector', emoji: '\u{1F4E6}', color: '#B272E8',
    vibe: 'Your card gets more monthly exercise than you',
    description: 'You have assembled quite the digital empire \u2014 streaming services, apps, memberships. Each one seemed essential at signup, but together they are quietly reshaping your bank balance.',
    genPlaybook: p => {
      const subs = p.subscriptions || [];
      const total = p.monthly.subscriptions;
      const names = subs.slice(0, 4).map(s => s.merchant + ' \u00a3' + s.averageAmount).join(', ');
      return {
        narrative: `${subs.length} subscriptions totalling \u00a3${total}/month (\u00a3${total * 12}/year): ${names}${subs.length > 4 ? ' and ' + (subs.length - 4) + ' more' : ''}. ${p.monthly.income > 0 ? 'That is ' + Math.round((total / p.monthly.income) * 100) + '% of your income on auto-pilot.' : 'A significant outgoing running on autopilot.'}`,
        strategies: [
          { title: 'Audit and rotate', text: 'Cancel the 2 you use least. Trial free alternatives for 30 days before re-subscribing.' },
          { title: 'Bundle where possible', text: 'Apple One, YouTube Premium family plans, or shared accounts can cut 30-40% off individual prices.' },
          { title: 'Set quarterly reviews', text: 'Put a calendar reminder every 3 months to check which subscriptions you actually opened this quarter.' }
        ]
      };
    },
    triggers: p => p.metrics.subscriptionCount >= 5 || p.monthly.subscriptions > 70
  },

  convenience_seeker: {
    name: 'The Convenience Seeker', emoji: '\u{1F6F5}', color: '#E87272',
    vibe: 'Time is money, so you spend money on time',
    description: 'Deliveroo, Uber, meal kits \u2014 your phone is basically a personal assistant. You have optimised your life for convenience, but at a premium.',
    genPlaybook: p => {
      const fd = p.monthly.foodDelivery;
      const tr = p.monthly.transport || 0;
      const topDel = p.topMerchants?.find(m => ['Deliveroo', 'Uber Eats', 'Just Eat'].includes(m.merchant));
      return {
        narrative: `\u00a3${fd}/month on food delivery${tr > 80 ? ' and \u00a3' + tr + ' on transport' : ''} \u2014 \u00a3${(fd + tr) * 12}/year on convenience.${topDel ? ' Most frequent: ' + topDel.merchant + ' (' + topDel.count + ' orders).' : ''} You are paying for time, not just food.`,
        strategies: [
          { title: 'Same convenience, lower cost', text: 'Swap ' + (Math.ceil(fd * 0.3 / 15)) + ' delivery orders per month for a meal prep box (Gousto, HelloFresh) \u2014 same zero-effort meals, roughly 40% cheaper per serving.' },
          { title: 'Strategic batch cooking', text: 'Cook double on Sundays. Freeze half. That covers 2-3 midweek meals you would otherwise order in. Saves ~\u00a3' + Math.round(fd * 0.25) + '/mo.' },
          { title: 'Transport audit', text: tr > 80 ? 'A monthly travel card or e-scooter pass may be cheaper than \u00a3' + tr + '/mo in individual rides.' : 'Keep transport lean \u2014 your main lever is food delivery.' }
        ]
      };
    },
    triggers: p => (p.monthly.foodDelivery + (p.monthly.transport || 0)) > 120
  },

  lifestyle_investor: {
    name: 'The Lifestyle Investor', emoji: '\u2728', color: '#E8C872',
    vibe: 'You are not spending, you are curating a life',
    description: 'Shopping, dining, experiences \u2014 these are not expenses in your mind. They are investments in the version of yourself you are building.',
    genPlaybook: p => {
      const shop = p.monthly.shopping || 0;
      const ent = p.monthly.entertainment || 0;
      const eat = p.monthly.eatingOut || 0;
      const total = shop + ent + eat;
      return {
        narrative: `\u00a3${total}/month (\u00a3${total * 12}/year) on lifestyle \u2014 \u00a3${shop} shopping${ent > 0 ? ', \u00a3' + ent + ' entertainment' : ''}${eat > 0 ? ', \u00a3' + eat + ' eating out' : ''}. ${p.monthly.income > 0 ? Math.round((total / p.monthly.income) * 100) + '% of income goes to how you live, not just what you need.' : 'A significant investment in quality of life.'}`,
        strategies: [
          { title: 'Curate with a budget', text: 'Set a monthly lifestyle budget of \u00a3' + Math.round(total * 0.8) + ' (\u00a3' + Math.round(total * 0.2) + ' less). Choose where to spend it rather than cutting everything.' },
          { title: 'Experience over things', text: 'Experiences create longer-lasting satisfaction than purchases. Shift \u00a3' + Math.round(shop * 0.15) + '/mo from shopping to experiences you will remember.' },
          { title: 'The 30-day list', text: 'Before any purchase over \u00a350, add it to a list. If you still want it in 30 days, buy it guilt-free. Most items drop off.' }
        ]
      };
    },
    triggers: p => ((p.monthly.shopping || 0) + (p.monthly.entertainment || 0) + (p.monthly.eatingOut || 0)) > 200
  },

  quiet_builder: {
    name: 'The Quiet Builder', emoji: '\u{1F331}', color: '#72E8B0',
    vibe: 'Your future self is already thanking you',
    description: 'While others chase the next dopamine hit, you are quietly building wealth. Your discipline will compound in ways most people do not understand yet.',
    genPlaybook: p => {
      const sr = p.metrics.savingsRate;
      const surplus = p.monthly.surplus;
      return {
        narrative: `Saving ${sr}% of income \u2014 \u00a3${surplus}/month (\u00a3${surplus * 12}/year). Well above the UK average of ${UK_BENCHMARKS.savingsRate}%.${p.metrics.debtAccountCount === 0 ? ' Debt-free.' : ' Managing debt while still saving \u2014 real discipline.'} At this rate, \u00a3${Math.round(surplus * 60).toLocaleString()} set aside in 5 years before investment growth.`,
        strategies: [
          { title: 'Optimise what you save', text: 'If your savings sit in a current account earning 0%, move them. An easy-access savings account or S&S ISA puts your discipline to work.' },
          { title: 'Automate the surplus', text: 'Set up a standing order on payday for \u00a3' + surplus + ' to a savings account. Remove the temptation to spend what is left.' },
          { title: 'Increase by 1%', text: 'You are at ' + sr + '%. Push to ' + (sr + 1) + '% \u2014 just \u00a3' + Math.round(p.monthly.income * 0.01) + '/month more. You will not feel it, but it compounds.' }
        ]
      };
    },
    triggers: p => p.metrics.savingsRate > 20
  },

  edge_walker: {
    name: 'The Edge Walker', emoji: '\u{1F3AD}', color: '#E87272',
    vibe: 'Living life one payday at a time',
    description: 'Your income and spending are in a constant dance, sometimes a little too close for comfort. You make it work, but there is no buffer.',
    genPlaybook: p => {
      const sr = p.metrics.savingsRate;
      const surplus = p.monthly.surplus;
      const topCat = p.categories[0];
      return {
        narrative: `Savings rate: ${sr}%.${surplus > 0 ? ' Roughly \u00a3' + surplus + '/month left over' : ' Spending almost everything you earn'}. Biggest outgoing: ${topCat ? topCat.name + ' (\u00a3' + topCat.total + '/mo)' : 'hard to pin down'}.${p.monthly.foodDelivery > 50 ? ' Food delivery alone: \u00a3' + p.monthly.foodDelivery + '/month.' : ''} One unexpected bill could tip the balance.`,
        strategies: [
          { title: 'Build a \u00a3500 buffer first', text: 'Before optimising anything else, get \u00a3500 into a separate account. That is your shock absorber. Even \u00a3' + Math.max(20, Math.round(surplus > 0 ? surplus * 0.5 : 30)) + '/month gets you there.' },
          { title: 'Find the single biggest leak', text: topCat ? 'Your top category is ' + topCat.name + ' at \u00a3' + topCat.total + '/mo. A 20% reduction there frees up \u00a3' + Math.round(topCat.total * 0.2) + '/month.' : 'Identify which category is eating the most and target a 20% reduction.' },
          { title: 'Separate spending money', text: 'On payday, move bills + target savings out immediately. What remains is your actual spending money. This stops the slow bleed.' }
        ]
      };
    },
    triggers: p => p.metrics.savingsRate < 5 && p.metrics.savingsRate >= -10
  },

  debt_juggler: {
    name: 'The Debt Juggler', emoji: '\u{1F3AA}', color: '#E8A872',
    vibe: 'Keeping all the balls in the air',
    description: 'Credit cards, BNPL, maybe a loan \u2014 you are managing multiple financial obligations with precision. The question is whether you are juggling or drowning.',
    genPlaybook: p => {
      const dp = p.debtPayments || [];
      const total = p.monthly.debtPayments;
      const names = dp.slice(0, 3).map(d => d.merchant).join(', ');
      const pct = p.monthly.income > 0 ? Math.round((total / p.monthly.income) * 100) : 0;
      const smallest = dp.sort((a, b) => a.averageAmount - b.averageAmount)[0];
      return {
        narrative: `${dp.length} debt obligation${dp.length > 1 ? 's' : ''}: ${names}. \u00a3${total}/month (\u00a3${total * 12}/year) \u2014 ${pct}% of income.${p.metrics.bnplCount > 0 ? ' ' + p.metrics.bnplCount + ' active BNPL account' + (p.metrics.bnplCount > 1 ? 's' : '') + '.' : ', '}`,
        strategies: [
          { title: 'Snowball: clear ' + ((smallest || {}).merchant || 'smallest') + ' first', text: smallest ? 'At \u00a3' + smallest.averageAmount + '/month, this clears fastest. Once done, redirect that \u00a3' + smallest.averageAmount + ' to the next debt. Momentum builds.' : 'Clear the smallest debt first for psychological momentum, then redirect payments.' },
          { title: 'Stop the BNPL cycle', text: p.metrics.bnplCount > 0 ? 'You have ' + p.metrics.bnplCount + ' BNPL account' + (p.metrics.bnplCount > 1 ? 's' : '') + '. Delete the apps. BNPL makes spending invisible until the bill arrives.' : 'Avoid adding new debt while paying off existing obligations.' },
          { title: 'Consolidation check', text: pct > 20 ? 'At ' + pct + '% of income going to debt, a consolidation loan at a lower rate could reduce your monthly outgoing and simplify to one payment.' : 'Your debt-to-income ratio is manageable. Focus on accelerating the smallest balance.' }
        ]
      };
    },
    triggers: p => p.metrics.debtAccountCount >= 3 || (p.monthly.debtPayments > 0 && p.monthly.debtPayments > p.monthly.income * 0.15)
  },

  impulse_surfer: {
    name: 'The Impulse Surfer', emoji: '\u26A1', color: '#E8D572',
    vibe: 'See it. Want it. Tap. Done.',
    description: 'Your spending spikes unpredictably \u2014 a calm week followed by a burst. Shopping is emotional, spontaneous, and satisfying in the moment.',
    genPlaybook: p => {
      const shop = p.monthly.shopping || 0;
      const topShop = p.topMerchants?.find(m => ['Amazon', 'ASOS', 'Zara', 'IKEA'].includes(m.merchant));
      return {
        narrative: `\u00a3${shop}/month on shopping (\u00a3${shop * 12}/year).${topShop ? ' ' + topShop.merchant + ' alone: ' + topShop.count + ' transactions.' : ''} The pattern is reactive, not planned \u2014 shopping as a response to how you feel.`,
        strategies: [
          { title: 'Add friction', text: 'Remove saved card details from ' + (topShop ? topShop.merchant : 'your top retailer') + '. Having to type your card number adds a 30-second pause that kills most impulse buys.' },
          { title: 'The 24-hour screenshot rule', text: 'See something you want? Screenshot it. If you still want it tomorrow, buy it. This eliminates \u00a3' + Math.round(shop * 0.2) + '/mo in regret purchases.' },
          { title: 'Redirect the dopamine', text: 'Shopping gives a hit. So does moving money to savings. Set up a \u00a3' + Math.min(50, Math.round(shop * 0.15)) + ' auto-transfer on days you typically shop \u2014 get the same satisfaction from building, not spending.' }
        ]
      };
    },
    triggers: p => {
      const shop = p.monthly.shopping || 0;
      const topShop = p.topMerchants?.filter(m => ['Amazon', 'ASOS', 'Zara', 'IKEA'].includes(m.merchant)) || [];
      const highFreq = topShop.some(m => m.count > 6);
      return shop > 120 && (highFreq || shop > 200);
    }
  },

  comfort_spender: {
    name: 'The Comfort Spender', emoji: '\u2615', color: '#C8A872',
    vibe: 'A little treat never hurt anyone... right?',
    description: 'Coffee runs, meals out, small luxuries \u2014 your spending is death by a thousand cuts. Each purchase is tiny, but they add up to a lifestyle.',
    genPlaybook: p => {
      const eat = p.monthly.eatingOut || 0;
      const fd = p.monthly.foodDelivery || 0;
      const groc = p.monthly.groceries || 0;
      const coffeeMerch = p.topMerchants?.filter(m => ['Starbucks', 'Costa', 'Pret', 'Greggs', 'Caffe Nero'].includes(m.merchant)) || [];
      const coffeeMonthly = Math.round(coffeeMerch.reduce((s, m) => s + m.total, 0) / Math.max(1, p.monthSpan));
      return {
        narrative: `\u00a3${eat}/month eating out${coffeeMonthly > 0 ? ' (including ~\u00a3' + coffeeMonthly + ' on coffee/quick bites)' : ''}${fd > 30 ? ', plus \u00a3' + fd + '/month on delivery' : ''}. Food-related total: \u00a3${eat + fd + groc}/month (\u00a3${(eat + fd + groc) * 12}/year). Frequent, small transactions that feel harmless but form your biggest category.`,
        strategies: [
          { title: 'Keep the ritual, cut the cost', text: coffeeMonthly > 15 ? 'Make coffee at home 3 days a week. Keep your ' + coffeeMerch[0]?.merchant + ' habit for the other days. Saves ~\u00a3' + Math.round(coffeeMonthly * 0.5) + '/month.' : 'Bring lunch 2 days a week. Keep eating out for the social days.' },
          { title: 'Set a treats budget', text: 'Give yourself \u00a3' + Math.round((eat + fd) * 0.7) + '/month for eating out and delivery \u2014 guilt-free. Once it is gone, you cook. This cuts \u00a3' + Math.round((eat + fd) * 0.3) + '/month without willpower.' },
          { title: 'Swap, do not stop', text: 'Replace 2 Deliveroo orders with a nice home-cooked meal you actually enjoy. The goal is not deprivation \u2014 it is finding comfort that costs less.' }
        ]
      };
    },
    triggers: p => {
      const eat = p.monthly.eatingOut || 0;
      const coffeeMerch = p.topMerchants?.filter(m => ['Starbucks', 'Costa', 'Pret', 'Greggs'].includes(m.merchant)) || [];
      return eat > 100 || coffeeMerch.length >= 2;
    }
  },

  side_hustler: {
    name: 'The Side Hustler', emoji: '\u{1F4B0}', color: '#72E8D5',
    vibe: 'Multiple income streams, one ambitious brain',
    description: 'You have income coming from more than one place. Whether it is freelancing, selling, or investing \u2014 you understand that one salary is a single point of failure.',
    genPlaybook: p => {
      const inc = p.monthly.income;
      const sr = p.metrics.savingsRate;
      return {
        narrative: `Monthly income: \u00a3${inc} from multiple sources.${sr > 15 ? ' Saving ' + sr + '% \u2014 real financial awareness.' : ' Savings rate: ' + sr + '% \u2014 the hustle is funding lifestyle, not reserves.'} ${p.monthly.subscriptions > 50 ? '\u00a3' + p.monthly.subscriptions + '/month in tools and subscriptions \u2014 the cost of doing business.' : 'Overheads are lean.'}`,
        strategies: [
          { title: 'Separate business from personal', text: 'Open a second account for side income. Pay yourself a fixed amount monthly. Let the rest accumulate for tax, investment, or growth.' },
          { title: sr < 15 ? 'Save the side income' : 'Scale what works', text: sr < 15 ? 'Your main salary covers lifestyle. Redirect 100% of side income to savings for 3 months \u2014 that is \u00a3' + Math.round((inc - p.monthly.spending) * 3) + ' in reserve.' : 'Double down on the highest-returning income stream. Invest time where the \u00a3/hour is highest.' },
          { title: 'Tax efficiency', text: 'Multiple income streams = tax complexity. Make sure you are using your ISA allowance (\u00a320k/year) and claiming allowable expenses.' }
        ]
      };
    },
    triggers: p => {
      const incTxs = p.incomeStreams || 0;
      return incTxs >= 2 && p.monthly.income > 0;
    }
  },

  balanced_realist: {
    name: 'The Balanced Realist', emoji: '\u2696\uFE0F', color: '#72B0E8',
    vibe: 'Boring is your financial superpower',
    description: 'No extreme patterns here \u2014 just steady, sensible money management. You will not make the news, but you will make retirement.',
    genPlaybook: p => {
      const sr = p.metrics.savingsRate;
      const surplus = p.monthly.surplus;
      return {
        narrative: `Saving ${sr}% (\u00a3${surplus}/month). Spending spread across categories without extremes.${p.metrics.debtAccountCount === 0 ? ' Debt-free.' : ' ' + p.metrics.debtAccountCount + ' debt payment' + (p.metrics.debtAccountCount > 1 ? 's' : '') + ' but proportionate.'} This is quiet financial confidence. The risk is complacency.`,
        strategies: [
          { title: 'Push from fine to great', text: 'You are stable at ' + sr + '%. The next level is ' + Math.min(sr + 5, 30) + '%. That is \u00a3' + Math.round(p.monthly.income * 0.05) + '/month more \u2014 invest it, do not save it.' },
          { title: 'Optimise, do not cut', text: 'You do not need to spend less. You need your money working harder. Check your savings rate, switch providers, and make sure idle cash is earning interest.' },
          { title: 'Set one ambitious goal', text: 'Stability is your base. Now pick one thing: a house deposit, early retirement target, or investment milestone. Give your discipline a destination.' }
        ]
      };
    },
    triggers: p => true
  }
};

// TRAITS
const SUB_TRAITS = [
  { id: 'delivery', emoji: '\u{1F355}', text: 'Delivery-dependent', check: p => p.monthly.foodDelivery > 80 },
  { id: 'credit', emoji: '\u{1F4B3}', text: 'Credit-active', check: p => p.metrics.creditCardCount >= 2 },
  { id: 'bnpl', emoji: '\u{1F4B8}', text: 'BNPL user', check: p => p.metrics.bnplCount >= 1 },
  { id: 'commuter', emoji: '\u{1F682}', text: 'Commuter', check: p => p.monthly.transport > 150 },
  { id: 'streaming', emoji: '\u{1F4FA}', text: 'Streaming heavy', check: p => p.metrics.streamingCount >= 3 },
  { id: 'techsub', emoji: '\u{1F4BB}', text: 'Tech subscriber', check: p => p.subscriptions && p.subscriptions.some(s => ['ChatGPT', 'Claude', 'Midjourney', 'Cursor', 'Lovable'].includes(s.merchant)) },
  { id: 'coffee', emoji: '\u2615', text: 'Coffee regular', check: p => p.topMerchants && p.topMerchants.some(m => ['Starbucks', 'Costa', 'Pret'].includes(m.merchant) && m.count > 8) },
  { id: 'impulse', emoji: '\u26A1', text: 'Impulse buyer', check: p => (p.monthly.shopping || 0) > 150 },
  { id: 'foodie', emoji: '\u{1F37D}\uFE0F', text: 'Foodie', check: p => ((p.monthly.eatingOut || 0) + p.monthly.foodDelivery) > 150 },
  { id: 'saver', emoji: '\u{1F331}', text: 'Active saver', check: p => p.metrics.savingsRate > 25 },
  { id: 'grocery', emoji: '\u{1F6D2}', text: 'Home cook', check: p => (p.monthly.groceries || 0) > (p.monthly.foodDelivery || 0) * 2 && (p.monthly.groceries || 0) > 100 }
];

// RULES
const STRENGTH_RULES = [
  { text: 'Strong savings discipline', check: p => p.metrics.savingsRate > 15 },
  { text: 'Debt-free lifestyle', check: p => p.metrics.debtAccountCount === 0 },
  { text: 'Keeps subscriptions lean', check: p => p.metrics.subscriptionCount <= 4 },
  { text: 'Conscious grocery shopper', check: p => (p.monthly.groceries || 0) > (p.monthly.foodDelivery || 0) * 1.5 },
  { text: 'Resists delivery temptation', check: p => (p.monthly.foodDelivery || 0) < UK_BENCHMARKS.foodDelivery }
];

const BLINDSPOT_RULES = [
  { text: 'Subscription creep risk', detail: 'Multiple services adding up silently', check: p => p.metrics.subscriptionCount >= 6 },
  { text: 'Delivery dependency', detail: 'Convenience premium eating into savings', check: p => (p.monthly.foodDelivery || 0) > 100 },
  { text: 'Multiple BNPL accounts', detail: 'Buy-now-pay-later spreading thin', check: p => p.metrics.bnplCount >= 2 },
  { text: 'Credit card stacking', detail: 'Managing multiple credit lines', check: p => p.metrics.creditCardCount >= 3 },
  { text: 'Savings rate below target', detail: 'Under the recommended 20%', check: p => p.metrics.savingsRate < 10 && p.metrics.savingsRate >= 0 }
];

module.exports = ARCHETYPES;
module.exports.ARCHETYPES = ARCHETYPES;
module.exports.ESSENTIAL_CATEGORIES = ESSENTIAL_CATEGORIES;
module.exports.UK_BENCHMARKS = UK_BENCHMARKS;
module.exports.SUB_TRAITS = SUB_TRAITS;
module.exports.STRENGTH_RULES = STRENGTH_RULES;
module.exports.BLINDSPOT_RULES = BLINDSPOT_RULES;
