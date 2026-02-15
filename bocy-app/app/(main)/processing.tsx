import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';

const STEPS = [
  { label: 'Reading your transactions', duration: 1500 },
  { label: 'Recognising merchants', duration: 2000 },
  { label: 'Spotting patterns in your spending', duration: 2000 },
  { label: 'Aligning with your goals', duration: 1500 },
  { label: 'Building your recommendations', duration: 1000 },
];

export default function ProcessingScreen() {
  const { csvData, source, goals } = useLocalSearchParams<{
    csvData: string;
    source: string;
    goals: string;
  }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    runAnalysis();
  }, []);

  const runAnalysis = async () => {
    try {
      const parsedGoals = goals ? JSON.parse(goals) : {};

      // Step through the progress indicators
      for (let i = 0; i < STEPS.length; i++) {
        setCurrentStep(i);
        // On the actual processing step, run the engine
        if (i === 2) {
          // Dynamically import the engine and move engine
          const EnrichmentEngine = (await import('../../lib/enrichment-engine')).default;
          const { findMostMaterialMove } = await import('../../lib/move-engine');
          const engine = new EnrichmentEngine();
          const result = await engine.enrich(csvData || '');

          // Load user goals from Supabase for move ranking
          const { data: { user } } = await supabase.auth.getUser();
          let userGoals = parsedGoals;
          if (user) {
            const { data: goalsData } = await supabase
              .from('goals')
              .select('*')
              .eq('user_id', user.id)
              .single();
            if (goalsData) {
              userGoals = {
                current_situation: goalsData.current_situation,
                one_year_goal: goalsData.one_year_goal,
                two_year_goal: goalsData.two_year_goal,
                target_amount: goalsData.target_amount,
                ...parsedGoals,
              };
            }
          }

          // Run move engine: UKPF priority + goal-aware ranking + trajectories
          const moveResult = findMostMaterialMove(
            result.profile,
            userGoals,
            result.decisionStack || [],
          );

          // Build ranked moves with trajectory data
          const rankedMoves = moveResult.allScored.map((s: any) => ({
            ...s.move,
            monthlySaving: s.monthlySaving,
            goalRelevance: s.goalRelevance,
            priorityAlignment: s.priorityAlignment,
          }));

          // Save analysis to Supabase with enriched move data
          if (user && result) {
            await supabase.from('analyses').insert({
              user_id: user.id,
              archetype: result.archetype?.key || 'unknown',
              decision_score: result.decisionScore?.score || 0,
              monthly_income: result.profile?.monthly?.income || 0,
              monthly_spending: result.profile?.monthly?.spending || 0,
              surplus: result.profile?.monthly?.surplus || 0,
              non_discretionary: result.profile?.budgetReality?.nonDiscretionary || {},
              discretionary: result.profile?.budgetReality?.discretionary || {},
              income_sources: result.profile?.incomeSources || [],
              top_move: moveResult.topMove || result.decisionStack?.[0] || {},
              all_moves: rankedMoves.length > 0 ? rankedMoves : result.decisionStack || [],
              behavioral_patterns: result.behavioralPatterns || [],
              goal_context: {
                goal: moveResult.goal,
                ukpfPriority: moveResult.ukpfPriority,
                currentTrajectory: moveResult.currentTrajectory,
                newTrajectory: moveResult.newTrajectory,
                monthsSaved: moveResult.monthsSaved,
                monthlySaving: moveResult.monthlySaving,
                insight: moveResult.insight,
              },
            });
          }

          // Store result in memory for results screen
          (globalThis as any).__bocyResult = result;
          (globalThis as any).__bocyGoals = userGoals;
          (globalThis as any).__bocyMoveResult = moveResult;
        }

        // Step 4: Claude refinement — rewrite moves into outcome-focused language
        if (i === 3 && (globalThis as any).__bocyMoveResult) {
          try {
            const mr = (globalThis as any).__bocyMoveResult;
            const profile = (globalThis as any).__bocyResult?.profile;
            const movesToRefine = mr.allScored?.slice(0, 3).map((s: any) => s.move) || [];
            if (movesToRefine.length > 0 && profile) {
              const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
              const refinementPrompt = `You are BOCY, a financial decision engine. Rewrite these financial recommendations to be outcome-focused with specific amounts, timelines, and named merchants from the user's data.

RULES:
- Each action must start with a quantified outcome (e.g. "Free £94/mo by cancelling...")
- Include specific merchant names and amounts from the data
- Tie to user's goal where possible: "${mr.goal?.label || 'Improve finances'}"
- UKPF priority: "${mr.ukpfPriority?.label || 'Optimise'}"
- Keep each under 80 characters
- Return ONLY a JSON array of strings, one per move. No explanation.

User's financial data:
- Monthly income: £${profile.monthly?.income || 0}
- Monthly spending: £${profile.monthly?.spending || 0}
- Surplus: £${profile.monthly?.surplus || 0}
- Savings rate: ${profile.metrics?.savingsRate || 0}%

Current moves to rewrite:
${movesToRefine.map((m: any, idx: number) => `${idx + 1}. "${m.action}" (saves £${m.monthlySaving || Math.round((m.annualImpact || 0) / 12)}/mo, type: ${m.type}, details: ${JSON.stringify(m.details?.items?.slice(0, 3).map((it: any) => it.name + ' £' + it.amount) || [])})`).join('\n')}`;

              const resp = await fetch(`${apiUrl}/api/claude/enrich`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: refinementPrompt, max_tokens: 512 }),
              });
              if (resp.ok) {
                const data = await resp.json();
                if (data.text) {
                  try {
                    const jsonMatch = data.text.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                      const refined = JSON.parse(jsonMatch[0]);
                      // Update move actions with Claude-refined language
                      const updatedMoves = [...(mr.allScored || [])];
                      refined.forEach((action: string, idx: number) => {
                        if (updatedMoves[idx] && typeof action === 'string' && action.length > 10) {
                          updatedMoves[idx].move.action = action;
                        }
                      });
                      // Update the stored move result and top move
                      if (updatedMoves[0]) {
                        mr.topMove = updatedMoves[0].move;
                        mr.insight = mr.insight; // keep original trajectory insight
                      }
                      // Update Supabase with refined moves
                      const { data: { user: u } } = await supabase.auth.getUser();
                      if (u) {
                        const refinedRanked = updatedMoves.map((s: any) => ({
                          ...s.move,
                          monthlySaving: s.monthlySaving,
                          goalRelevance: s.goalRelevance,
                          priorityAlignment: s.priorityAlignment,
                        }));
                        await supabase.from('analyses')
                          .update({
                            top_move: mr.topMove,
                            all_moves: refinedRanked,
                          })
                          .eq('user_id', u.id)
                          .order('created_at', { ascending: false })
                          .limit(1);
                      }
                    }
                  } catch { /* Claude response wasn't valid JSON — keep original moves */ }
                }
              }
            }
          } catch { /* Claude refinement failed — continue with original moves */ }
        }

        await new Promise(r => setTimeout(r, STEPS[i].duration));
      }

      // Navigate to results
      router.replace('/(main)/results' as any);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Animated.View style={[s.inner, { opacity: fadeAnim }]}>
        <Text style={s.logo}>Analysing</Text>

        <View style={s.stepsWrap}>
          {STEPS.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={[
                s.stepDot,
                i < currentStep && s.stepDotDone,
                i === currentStep && s.stepDotActive,
              ]}>
                {i < currentStep && <Text style={s.checkmark}>&#10003;</Text>}
                {i === currentStep && <View style={s.pulse} />}
              </View>
              <Text style={[
                s.stepText,
                i < currentStep && s.stepTextDone,
                i === currentStep && s.stepTextActive,
              ]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {error ? (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : (
          <Text style={s.hint}>This usually takes just a moment</Text>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontFamily: 'SpaceMono',
    fontSize: 24,
    color: theme.colors.accent,
    letterSpacing: 6,
    marginBottom: 48,
  },
  stepsWrap: {
    gap: 20,
    width: '100%',
    maxWidth: 300,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: {
    borderColor: theme.colors.mint,
    backgroundColor: 'rgba(114,232,176,0.15)',
  },
  stepDotActive: {
    borderColor: theme.colors.accent,
  },
  checkmark: {
    fontSize: 12,
    color: theme.colors.mint,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  stepText: {
    fontSize: 15,
    color: theme.colors.muted,
  },
  stepTextDone: {
    color: theme.colors.dim,
  },
  stepTextActive: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  hint: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 48,
  },
  errorWrap: {
    marginTop: 32,
    padding: 16,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(232,114,114,0.1)',
    borderWidth: 1,
    borderColor: theme.colors.coralDim,
  },
  errorText: {
    color: theme.colors.coral,
    fontSize: 14,
    textAlign: 'center',
  },
});
