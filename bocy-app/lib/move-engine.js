// Bocy Move Engine — goal-aware financial move ranking
// Takes enrichment profile + user goals and identifies the single most material move

/**
 * Goal timeline calculations
 * Maps user goals to concrete financial targets and timelines
 */
const GOAL_TARGETS = {
  // 1-year goals
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
  // 2-year goals
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

/**
 * Calculate months to reach target at current trajectory
 */
function monthsToGoal(surplus, targetAmount) {
  if (surplus <= 0) return Infinity;
  return Math.ceil(targetAmount / surplus);
}

/**
 * Score a move's impact on the user's primary goal
 * Higher score = more material to reaching the goal
 */
function scoreMoveForGoal(move, goal, profile) {
  const monthlySaving = Math.round((move.annualImpact || 0) / 12);
  const currentSurplus = profile.monthly?.surplus || 0;

  // Current trajectory
  const currentMonths = monthsToGoal(Math.max(currentSurplus, 0), goal.targetAmount);

  // New trajectory if move is executed
  const newSurplus = currentSurplus + monthlySaving;
  const newMonths = monthsToGoal(Math.max(newSurplus, 0), goal.targetAmount);

  // Months saved
  const monthsSaved = currentMonths === Infinity
    ? (newMonths === Infinity ? 0 : goal.timelineMonths)
    : Math.max(0, currentMonths - newMonths);

  // Effort multiplier — low effort moves are more actionable
  const effortScore = move.effort === 'low' ? 1.0 : move.effort === 'medium' ? 0.7 : 0.5;

  // Goal-specific bonuses
  let goalBonus = 1.0;
  if (goal.metric === 'debt_reduction' && move.type === 'debt') goalBonus = 1.5;
  if (goal.metric === 'spending_reduction' && (move.type === 'convenience' || move.type === 'behavioral')) goalBonus = 1.3;
  if (goal.metric === 'savings' && monthlySaving > 0) goalBonus = 1.2;

  // Composite score
  const impactScore = monthlySaving * effortScore * goalBonus;

  return {
    move,
    monthlySaving,
    currentMonths: currentMonths === Infinity ? null : currentMonths,
    newMonths: newMonths === Infinity ? null : newMonths,
    monthsSaved: monthsSaved === Infinity ? null : monthsSaved,
    impactScore,
    goalRelevance: goalBonus > 1.0 ? 'high' : 'normal',
  };
}

/**
 * findMostMaterialMove
 *
 * Input:
 *   profile  — from EnrichmentEngine.enrich().profile
 *   goals    — { current, oneYear, twoYear, targetAmount }
 *   allMoves — from EnrichmentEngine.enrich().decisionStack
 *
 * Output: {
 *   topMove       — the single highest-leverage move
 *   allScored     — all moves scored and ranked
 *   goal          — the resolved primary goal
 *   currentTrajectory — months to goal without changes
 *   newTrajectory     — months to goal if top move executed
 *   monthsSaved       — delta
 *   insight           — human-readable summary
 * }
 */
export function findMostMaterialMove(profile, goals, allMoves) {
  if (!allMoves || allMoves.length === 0) {
    return {
      topMove: null,
      allScored: [],
      goal: null,
      currentTrajectory: null,
      newTrajectory: null,
      monthsSaved: null,
      insight: 'We need more transaction data to identify your top move.',
    };
  }

  // Resolve primary goal — use 1-year goal as primary, fall back to 2-year
  const primaryGoalKey = goals?.oneYear || goals?.twoYear || 'reduce_spending';
  const goalFn = GOAL_TARGETS[primaryGoalKey] || GOAL_TARGETS.reduce_spending;
  const goal = goalFn(profile, goals?.targetAmount);

  // Score every move against the primary goal
  const scored = allMoves
    .map(move => scoreMoveForGoal(move, goal, profile))
    .sort((a, b) => b.impactScore - a.impactScore);

  const top = scored[0];
  if (!top || top.impactScore <= 0) {
    return {
      topMove: allMoves[0],
      allScored: scored,
      goal,
      currentTrajectory: null,
      newTrajectory: null,
      monthsSaved: null,
      insight: 'Your finances are already well-optimised for your goal.',
    };
  }

  // Generate insight
  const surplus = profile.monthly?.surplus || 0;
  let insight = '';
  if (surplus <= 0) {
    insight = `You're currently spending more than you earn. ${top.move.action} would free up £${top.monthlySaving}/mo, moving you from a deficit to a path toward "${goal.label}".`;
  } else if (top.currentMonths && top.newMonths) {
    insight = `At your current pace, "${goal.label}" takes ${top.currentMonths} months. ${top.move.action} saves £${top.monthlySaving}/mo, cutting that to ${top.newMonths} months — ${top.monthsSaved} months sooner.`;
  } else if (top.currentMonths === null && top.newMonths) {
    insight = `Without changes, "${goal.label}" isn't reachable on current trajectory. ${top.move.action} (£${top.monthlySaving}/mo) makes it achievable in ${top.newMonths} months.`;
  } else {
    insight = `${top.move.action} saves £${top.monthlySaving}/mo (£${top.move.annualImpact}/yr), accelerating your path to "${goal.label}".`;
  }

  return {
    topMove: top.move,
    allScored: scored,
    goal,
    currentTrajectory: top.currentMonths,
    newTrajectory: top.newMonths,
    monthsSaved: top.monthsSaved,
    monthlySaving: top.monthlySaving,
    insight,
  };
}

export default findMostMaterialMove;
