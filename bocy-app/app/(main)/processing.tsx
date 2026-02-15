import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import EnrichmentEngine from '@/lib/enrichment-engine';
import { findMostMaterialMove, calcGoalTrajectory } from '@/lib/move-engine';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing } from '@/theme';

const STEPS = [
  'Reading your transactions',
  'Recognising merchants',
  'Spotting patterns in your spending',
  'Aligning with your goals',
  'Building your recommendations',
];

export default function Processing() {
  const { csvData } = useLocalSearchParams<{ csvData: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const fadeAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const router = useRouter();

  useEffect(() => {
    // Animate steps sequentially
    STEPS.forEach((_, i) => {
      setTimeout(() => {
        setCurrentStep(i);
        Animated.timing(fadeAnims[i], { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }, i * 800);
    });
  }, []);

  useEffect(() => {
    if (!csvData) return;
    runAnalysis();
  }, [csvData]);

  const runAnalysis = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // Run enrichment
      const result = EnrichmentEngine.enrich(csvData);

      // Get goals
      const { data: goals } = await supabase.from('goals').select('*').eq('user_id', user.id).single();

      // Find top move
      const topMove = findMostMaterialMove(result.decisionStack, result.profile, goals);
      const goalContext = calcGoalTrajectory(result.profile, goals, topMove);

      // Refine moves via Claude
      let allMoves = result.decisionStack;
      if (topMove && result.decisionStack.length > 0) {
        try {
          const movesToRefine = result.decisionStack.slice(0, 3);
          const prompt = `Rewrite these financial actions as short, outcome-focused one-liners. Return a JSON array of strings. Actions: ${JSON.stringify(movesToRefine.map((m: any) => m.action))}`;
          const res = await fetch('/api/claude/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, max_tokens: 512 }),
          });
          const data = await res.json();
          if (data.success && data.text) {
            try {
              const refined = JSON.parse(data.text);
              allMoves = allMoves.map((m: any, i: number) =>
                i < refined.length ? { ...m, action: refined[i] } : m
              );
            } catch { /* keep original if parse fails */ }
          }
        } catch { /* keep original if API fails */ }
      }

      // Save to DB
      const { error: insertErr } = await supabase.from('analyses').insert({
        user_id: user.id,
        archetype: result.archetype.key,
        decision_score: result.decisionScore.score,
        monthly_income: result.profile.monthly.income,
        monthly_spending: result.profile.monthly.spending,
        surplus: result.profile.monthly.surplus,
        non_discretionary: result.profile.budgetReality.nonDiscretionary,
        discretionary: result.profile.budgetReality.discretionary,
        income_sources: result.profile.incomeSources,
        top_move: topMove,
        all_moves: allMoves,
        behavioral_patterns: result.behavioralPatterns,
        goal_context: goalContext,
      });

      if (insertErr) throw insertErr;

      // Store result globally for results screen
      (globalThis as any).__bocyResult = {
        ...result,
        topMove,
        allMoves,
        goalContext,
      };

      // Wait for animations to finish, then navigate
      setTimeout(() => {
        router.replace('/(main)/results');
      }, Math.max(0, STEPS.length * 800 - 2000));
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Analysing your finances</Text>
      <View style={s.steps}>
        {STEPS.map((label, i) => (
          <Animated.View key={i} style={[s.stepRow, { opacity: fadeAnims[i] }]}>
            <Text style={[s.dot, i <= currentStep && s.dotActive]}>
              {i < currentStep ? '\u2713' : '\u2022'}
            </Text>
            <Text style={[s.stepText, i <= currentStep && s.stepTextActive]}>{label}</Text>
          </Animated.View>
        ))}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', paddingHorizontal: spacing.lg },
  title: { fontFamily: fonts.mono, fontSize: 22, color: colors.text, textAlign: 'center', marginBottom: spacing.xl },
  steps: { gap: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { fontFamily: fonts.mono, fontSize: 16, color: colors.muted, width: 24 },
  dotActive: { color: colors.accent },
  stepText: { fontFamily: fonts.mono, fontSize: 13, color: colors.muted },
  stepTextActive: { color: colors.text2 },
  error: { fontFamily: fonts.mono, fontSize: 13, color: colors.coral, textAlign: 'center', marginTop: spacing.lg },
});
