// Bocy Move Engine — UKPF flowchart priority + goal-aware ranking
// Determines where user sits on the UK Personal Finance flowchart,
// then scores moves by priority level and goal alignment.

/**
 * UKPF Flowchart Priority Levels
 * Based on r/UKPersonalFinance flowchart (ukpersonal.finance/flowchart)
 *
 * Phase 1: Budget & essentials (handled by enrichment engine)
 * Phase 2: Reliant on credit → debt counselling (StepChange)
 * Phase 3: Small emergency fund (1-3 months) + employer pension match
 * Phase 4: High-interest debt (4%+ APR, excl. student loans)
 * Phase 5: Full emergency fund (3-12 months)
 * Phase 6: First home (LISA)
 * Phase 7-8: Short-term goals (cash savings)
 * Phase 9+: Long-term goals (pension/ISA/investing)
 */

const UKPF_PRIORITIES = {
  deficit: {
    level: 0,
    label: 'Break even',
    description: 'Your spending exceeds your income. Priority: reduce spending to break even.',
    flowchartPhase: 'Phase 1-2',
  },
  debt_crisis: {
    level: 1,
    label: 'Debt support',
    description: 'You may need professional debt advice. Free help is available from StepChange and Citizens Advice.',
    flowchartPhase: 'Phase 2',
  },
  small_emergency_fund: {
    level: 2,
    label: 'Build 1-month buffer',
    description: 'Before tackling debt aggressively, build a small safety net of 1-3 months of essential outgoings.',
    flowchartPhase: 'Phase 3',
  },
  high_interest_debt: {
    level: 3,
    label: 'Clear high-interest debt',
    description: 'Pay off debt above 4% APR using the avalanche (highest rate first) or snowball (smallest first) method.',
    flowchartPhase: 'Phase 4',
  },
  full_emergency_fund: {
    level: 4,
    label: 'Build 3-month buffer',
    description: 'Build a full emergency fund covering 3-6 months of outgoings.',
    flowchartPhase: 'Phase 5',
  },
  short_term_goals: {
    level: 5,
    label: 'Short-term goals',
    description: 'Save for goals within 5 years using high-interest cash savings.',
    flowchartPhase: 'Phase 7-8',
  },
  long_term_goals: {
    level: 6,
    label: 'Long-term goals',
    description: 'Invest for goals beyond 5 years via pension, S&S ISA, or LISA.',
    flowchartPhase: 'Phase 9+',
  },
};

/**
 * Determine where user sits on the UKPF flowchart
 */
function determineFlowchartPosition(profile, goals) {
  const surplus = profile.monthly?.surplus || 0;
  const income = profile.monthly?.income || 0;
  const spending = profile.monthly?.spending || 0;
  const debtPayments = profile.monthly?.debtPayments || 0;
  const debtCount = profile.metrics?.debtAccountCount || 0;
  const savingsRate = profile.metrics?.savingsRate || 0;
  const currentSituation = goals?.current_situation || goals?.current || '';

  // Phase 1-2: In deficit — spending exceeds income
  if (surplus <= 0) {
    // Severe: income doesn't cover non-negotiable costs
    if (debtCount >= 2 && income < spending * 0.85) {
      return UKPF_PRIORITIES.debt_crisis;
    }
    return UKPF_PRIORITIES.deficit;
  }

  // Phase 2: User self-identifies as in debt and reliant on credit
  if (currentSituation === 'in_debt' && debtCount >= 2 && debtPayments > income * 0.25) {
    return UKPF_PRIORITIES.debt_crisis;
  }

  // Phase 3: No/small emergency fund — surplus exists but savings rate < 5%
  // A user with low savings rate likely has no buffer
  if (savingsRate < 5 && surplus > 0) {
    return UKPF_PRIORITIES.small_emergency_fund;
  }

  // Phase 4: Has high-interest debt (credit cards, BNPL)
  const hasHighInterestDebt = (profile.metrics?.creditCardCount || 0) > 0 ||
    (profile.metrics?.bnplCount || 0) > 0;
  if (hasHighInterestDebt && debtPayments > 0) {
    return UKPF_PRIORITIES.high_interest_debt;
  }

  // Phase 4 alt: Other debt with low savings
  if (debtCount > 0 && savingsRate < 15) {
    return UKPF_PRIORITIES.high_interest_debt;
  }

  // Phase 5: Has surplus, no debt, but savings rate < 20% (no full buffer yet)
  if (savingsRate < 20) {
    return UKPF_PRIORITIES.full_emergency_fund;
  }

  // Phase 7-8: Short-term goals
  const shortTermGoals = ['save_target', 'reduce_spending', 'buy_home'];
  const oneYear = goals?.oneYear || goals?.one_year_goal || '';
  const twoYear = goals?.twoYear || goals?.two_year_goal || '';
  if (shortTermGoals.includes(oneYear) || shortTermGoals.includes(twoYear)) {
    return UKPF_PRIORITIES.short_term_goals;
  }

  // Phase 9+: Long-term goals
  return UKPF_PRIORITIES.long_term_goals;
}

/**
 * Goal timeline calculations
 * Maps user goals to concrete financial targets and timelines
 */
const GOAL_TARGETS = {
  clear_debt: (profile) => ({
    label: 'Clear debt',
    targetAmount: (profile.monthly?.debtPayments || 0) * 12,
    timelineMonths: 12,
    metric: 'debt_reduction',
  }),
  emergency_fund: (profile) => ({
    label: 'Build emergency fund',
    targetAmount: (profile.monthly?.spending || 2000) * 3,
    timelineMonths: 12,
    metric: 'savings',
  }),
  save_target: (profile, targetAmount) => ({
    label: `Save £${targetAmount || 5000}`,
    targetAmount: targetAmount || 5000,
    timelineMonths: 12,
    metric: 'savings',
  }),
  reduce_spending: (profile) => ({
    label: 'Reduce spending',
    targetAmount: Math.round((profile.monthly?.spending || 2000) * 0.15 * 12),
    timelineMonths: 12,
    metric: 'spending_reduction',
  }),
  buy_home: (profile) => ({
    label: 'Save for a home deposit',
    targetAmount: 25000,
    timelineMonths: 24,
    metric: 'savings',
  }),
  invest: (profile) => ({
    label: 'Start investing',
    targetAmount: (profile.monthly?.income || 2500) * 3,
    timelineMonths: 24,
    metric: 'savings',
  }),
  go_freelance: (profile) => ({
    label: 'Build a financial runway',
    targetAmount: (profile.monthly?.spending || 2000) * 6,
    timelineMonths: 24,
    metric: 'savings',
  }),
  financial_freedom: (profile) => ({
    label: 'Financial freedom',
    targetAmount: (profile.monthly?.spending || 2000) * 12,
    timelineMonths: 24,
    metric: 'savings',
  }),
};

function monthsToGoal(surplus, targetAmount) {
  if (surplus <= 0) return Infinity;
  return Math.ceil(targetAmount / surplus);
}

/**
 * Score a move considering UKPF priority + goal alignment + trajectory
 */
function scoreMoveWithPriority(move, goal, profile, ukpfPriority) {
  const monthlySaving = Math.round((move.annualImpact || 0) / 12);
  const currentSurplus = profile.monthly?.surplus || 0;

  const currentMonths = monthsToGoal(Math.max(currentSurplus, 0), goal.targetAmount);
  const newSurplus = currentSurplus + monthlySaving;
  const newMonths = monthsToGoal(Math.max(newSurplus, 0), goal.targetAmount);
  const monthsSaved = currentMonths === Infinity
    ? (newMonths === Infinity ? 0 : goal.timelineMonths)
    : Math.max(0, currentMonths - newMonths);

  const effortScore = move.effort === 'low' ? 1.0 : move.effort === 'medium' ? 0.7 : 0.5;

  // UKPF priority bonus — moves that align with the flowchart priority get a major boost
  let priorityBonus = 1.0;
  if (ukpfPriority.level <= 1 && currentSurplus <= 0) {
    // Deficit/debt crisis: biggest spending cuts rank highest
    priorityBonus = monthlySaving > 50 ? 2.0 : 1.5;
  }
  if (ukpfPriority.level === 2 || ukpfPriority.level === 4) {
    // Emergency fund phase: surplus-building moves get boosted
    if (move.type === 'subscription' || move.type === 'convenience') priorityBonus = 1.5;
  }
  if (ukpfPriority.level === 3) {
    // High-interest debt phase: debt moves get massive boost
    if (move.type === 'debt') priorityBonus = 2.5;
  }

  // Goal-specific bonuses
  let goalBonus = 1.0;
  if (goal.metric === 'debt_reduction' && move.type === 'debt') goalBonus = 1.5;
  if (goal.metric === 'spending_reduction' && (move.type === 'convenience' || move.type === 'behavioral')) goalBonus = 1.3;
  if (goal.metric === 'savings' && monthlySaving > 0) goalBonus = 1.2;

  const impactScore = monthlySaving * effortScore * priorityBonus * goalBonus;

  return {
    move,
    monthlySaving,
    currentMonths: currentMonths === Infinity ? null : currentMonths,
    newMonths: newMonths === Infinity ? null : newMonths,
    monthsSaved: monthsSaved === Infinity ? null : monthsSaved,
    impactScore,
    goalRelevance: goalBonus > 1.0 ? 'high' : 'normal',
    priorityAlignment: priorityBonus > 1.0 ? 'high' : 'normal',
  };
}

/**
 * findMostMaterialMove
 *
 * Input:
 *   profile  — from EnrichmentEngine.enrich().profile
 *   goals    — { current_situation, one_year_goal, two_year_goal, targetAmount }
 *   allMoves — from EnrichmentEngine.enrich().decisionStack
 *
 * Output: {
 *   topMove, allScored, goal, ukpfPriority,
 *   currentTrajectory, newTrajectory, monthsSaved,
 *   monthlySaving, insight
 * }
 */
export function findMostMaterialMove(profile, goals, allMoves) {
  // Determine UKPF flowchart position
  const ukpfPriority = determineFlowchartPosition(profile, goals);

  if (!allMoves || allMoves.length === 0) {
    return {
      topMove: null,
      allScored: [],
      goal: null,
      ukpfPriority,
      currentTrajectory: null,
      newTrajectory: null,
      monthsSaved: null,
      insight: 'We need more transaction data to identify your top move.',
    };
  }

  // Resolve primary goal — use 1-year goal, fall back to 2-year, then infer from UKPF position
  const oneYear = goals?.oneYear || goals?.one_year_goal || '';
  const twoYear = goals?.twoYear || goals?.two_year_goal || '';
  let primaryGoalKey = oneYear || twoYear || '';

  // If no goal set, infer from UKPF position
  if (!primaryGoalKey || !GOAL_TARGETS[primaryGoalKey]) {
    if (ukpfPriority.level <= 1) primaryGoalKey = 'reduce_spending';
    else if (ukpfPriority.level === 3) primaryGoalKey = 'clear_debt';
    else if (ukpfPriority.level <= 4) primaryGoalKey = 'emergency_fund';
    else primaryGoalKey = 'reduce_spending';
  }

  const goalFn = GOAL_TARGETS[primaryGoalKey] || GOAL_TARGETS.reduce_spending;
  const goal = goalFn(profile, goals?.targetAmount || goals?.target_amount);

  // Score every move with UKPF priority + goal alignment
  const scored = allMoves
    .map(move => scoreMoveWithPriority(move, goal, profile, ukpfPriority))
    .sort((a, b) => b.impactScore - a.impactScore);

  const top = scored[0];
  if (!top || top.impactScore <= 0) {
    return {
      topMove: allMoves[0],
      allScored: scored,
      goal,
      ukpfPriority,
      currentTrajectory: null,
      newTrajectory: null,
      monthsSaved: null,
      insight: 'Your finances are already well-optimised for your goal.',
    };
  }

  // Generate insight combining UKPF context + trajectory
  const surplus = profile.monthly?.surplus || 0;
  let insight = '';

  if (surplus <= 0) {
    insight = `Your spending exceeds your income by £${Math.abs(surplus)}/mo. ${top.move.action} would free up £${top.monthlySaving}/mo, moving you toward breaking even and building a buffer.`;
  } else if (ukpfPriority.level === 3 && top.move.type === 'debt') {
    // High-interest debt context
    if (top.currentMonths && top.newMonths) {
      insight = `Priority: clear high-interest debt. ${top.move.action} accelerates payoff from ${top.currentMonths} to ${top.newMonths} months — ${top.monthsSaved} months sooner.`;
    } else {
      insight = `Priority: clear high-interest debt. ${top.move.action} frees £${top.monthlySaving}/mo to accelerate payoff.`;
    }
  } else if (top.currentMonths && top.newMonths) {
    insight = `"${goal.label}" currently takes ${top.currentMonths} months. ${top.move.action} saves £${top.monthlySaving}/mo, cutting that to ${top.newMonths} months — ${top.monthsSaved} months sooner.`;
  } else if (top.currentMonths === null && top.newMonths) {
    insight = `"${goal.label}" isn't reachable without changes. ${top.move.action} (£${top.monthlySaving}/mo) makes it achievable in ${top.newMonths} months.`;
  } else {
    insight = `${top.move.action} saves £${top.monthlySaving}/mo (£${top.move.annualImpact}/yr), accelerating your path to "${goal.label}".`;
  }

  return {
    topMove: top.move,
    allScored: scored,
    goal,
    ukpfPriority,
    currentTrajectory: top.currentMonths,
    newTrajectory: top.newMonths,
    monthsSaved: top.monthsSaved,
    monthlySaving: top.monthlySaving,
    insight,
  };
}

export default findMostMaterialMove;
