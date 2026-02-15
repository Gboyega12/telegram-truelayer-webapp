/**
 * UKPF Flowchart-based move prioritisation and goal trajectory engine.
 */

const GOAL_LABELS = {
  clear_debt: 'Clear all debt',
  emergency_fund: 'Build emergency fund',
  save_target: 'Hit a savings target',
  reduce_spending: 'Reduce monthly spending',
  invest: 'Start investing',
  buy_home: 'Buy a home',
  go_freelance: 'Go freelance',
  financial_freedom: 'Achieve financial freedom',
};

const GOAL_TIMELINES = {
  clear_debt: 24,
  emergency_fund: 12,
  save_target: 18,
  reduce_spending: 3,
  invest: 6,
  buy_home: 60,
  go_freelance: 24,
  financial_freedom: 120,
};

const GOAL_DEFAULTS = {
  emergency_fund: 2500,
  save_target: 5000,
  buy_home: 25000,
  go_freelance: 10000,
  financial_freedom: 100000,
  reduce_spending: 0,
  invest: 1000,
  clear_debt: 0,
};

/**
 * Determine the user's UKPF flowchart phase.
 */
export function determineFlowchartPosition(profile, goals) {
  const surplus = profile.monthly.surplus;
  const debtCount = profile.metrics.debtAccountCount;
  const savingsRate = profile.metrics.savingsRate;
  const situation = goals?.current_situation || '';

  // Phase 0: Deficit
  if (surplus < 0) {
    return { level: 0, label: 'Break even', description: 'You\'re spending more than you earn. Step one is closing the gap.' };
  }

  // Phase 1: Debt crisis
  if (situation === 'in_debt' && debtCount >= 3) {
    return { level: 1, label: 'Debt support', description: 'Multiple debts need professional support. StepChange is free.' };
  }

  // Phase 2-3: Small emergency fund
  if (savingsRate < 5) {
    return { level: 2, label: 'Build a buffer', description: 'Priority: £500-£1000 emergency fund before anything else.' };
  }

  // Phase 4: Clear high-interest debt
  if (debtCount >= 1 && situation === 'in_debt') {
    return { level: 4, label: 'Clear high-interest debt', description: 'Focus on debts above 4% APR before saving aggressively.' };
  }

  // Phase 5: Full emergency fund
  if (savingsRate < 15) {
    return { level: 5, label: 'Full emergency fund', description: 'Target 3-6 months of expenses in easy-access savings.' };
  }

  // Phase 7-8: Short-term goals
  if (savingsRate < 25) {
    return { level: 7, label: 'Short-term goals', description: 'You have a solid foundation. Focus on specific targets.' };
  }

  // Phase 9+: Long-term wealth
  return { level: 9, label: 'Long-term wealth', description: 'Maximise ISAs, pensions, and investment returns.' };
}

/**
 * Calculate goal trajectory — how long to reach goal with and without top move.
 */
export function calcGoalTrajectory(profile, goals, topMove) {
  const oneYear = goals?.one_year_goal || '';
  const label = GOAL_LABELS[oneYear] || oneYear;
  const targetAmount = goals?.target_amount || GOAL_DEFAULTS[oneYear] || 5000;
  const timelineMonths = GOAL_TIMELINES[oneYear] || 24;

  const surplus = profile.monthly.surplus;
  const moveSaving = topMove?.monthlySaving || 0;

  const currentTrajectory = surplus > 0 ? Math.ceil(targetAmount / surplus) : Infinity;
  const newTrajectory = (surplus + moveSaving) > 0 ? Math.ceil(targetAmount / (surplus + moveSaving)) : Infinity;
  const monthsSaved = currentTrajectory === Infinity ? 0 : currentTrajectory - newTrajectory;

  let insight = '';
  if (currentTrajectory === Infinity) {
    insight = `At current pace, you won't reach your goal. The top move adds £${moveSaving}/month to get you moving.`;
  } else if (monthsSaved > 0) {
    insight = `This move cuts ${monthsSaved} months off your timeline — from ${currentTrajectory} to ${newTrajectory} months.`;
  } else {
    insight = `You're already on a good trajectory (${currentTrajectory} months). Keep it up.`;
  }

  return {
    goal: { label, targetAmount, timelineMonths },
    currentTrajectory,
    newTrajectory,
    monthsSaved,
    monthlySaving: moveSaving,
    insight,
  };
}

/**
 * Find the most impactful, goal-aligned move from the decision stack.
 */
export function findMostMaterialMove(decisionStack, profile, goals) {
  if (!decisionStack || decisionStack.length === 0) return null;

  const ukpf = determineFlowchartPosition(profile, goals);

  // Score each move
  const scored = decisionStack.map((move) => {
    let score = move.annualImpact / 100;

    // Bonus for low effort
    if (move.effort === 'low') score *= 1.3;
    else if (move.effort === 'high') score *= 0.8;

    // Bonus for UKPF alignment
    if (ukpf.level <= 2 && move.action.toLowerCase().includes('emergency')) score *= 1.5;
    if (ukpf.level === 4 && move.action.toLowerCase().includes('debt')) score *= 1.5;
    if (ukpf.level >= 7 && move.action.toLowerCase().includes('sav')) score *= 1.3;

    return { ...move, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);
  const top = scored[0];
  delete top._score;
  return top;
}
