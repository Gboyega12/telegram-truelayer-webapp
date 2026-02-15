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
          // Dynamically import the engine to avoid loading it on other screens
          const EnrichmentEngine = (await import('../../lib/enrichment-engine')).default;
          const engine = new EnrichmentEngine();
          const result = await engine.enrich(csvData || '');

          // Save analysis to Supabase
          const { data: { user } } = await supabase.auth.getUser();
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
              top_move: result.decisionStack?.[0] || {},
              all_moves: result.decisionStack || [],
              behavioral_patterns: result.behavioralPatterns || [],
            });
          }

          // Store result in memory for results screen
          // We use a global since Expo Router params have size limits
          (globalThis as any).__bocyResult = result;
          (globalThis as any).__bocyGoals = parsedGoals;
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
