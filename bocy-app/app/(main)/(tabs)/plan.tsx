import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, radius } from '@/theme';

export default function Plan() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [goals, setGoals] = useState<any>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: a } = await supabase
        .from('analyses').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single();
      setAnalysis(a);
      const { data: g } = await supabase.from('goals').select('*').eq('user_id', user.id).single();
      setGoals(g);
    })();
  }, []);

  if (!analysis) {
    return (
      <View style={s.container}>
        <Text style={s.empty}>Run an analysis to see your plan.</Text>
      </View>
    );
  }

  const moves = analysis.all_moves || [];
  const surplus = analysis.surplus;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <Text style={s.title}>Your action plan</Text>
      {goals && (
        <Text style={s.goalsText}>
          Situation: {goals.current_situation} | Goal: {goals.one_year_goal}
          {goals.target_amount ? ` (\u00A3${goals.target_amount})` : ''}
        </Text>
      )}
      <Text style={s.surplus}>
        Monthly surplus: <Text style={{ color: surplus >= 0 ? colors.mint : colors.coral }}>\u00A3{Math.round(surplus)}</Text>
      </Text>

      {/* Moves */}
      {moves.map((move: any, i: number) => {
        const isExpanded = expanded === i;
        return (
          <TouchableOpacity key={i} style={s.card} onPress={() => setExpanded(isExpanded ? null : i)} activeOpacity={0.8}>
            <View style={s.moveHeader}>
              <Text style={s.moveNum}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.moveAction}>{move.action}</Text>
                <Text style={s.moveImpact}>\u00A3{move.monthlySaving}/month | \u00A3{move.annualImpact}/year</Text>
              </View>
              <View style={[s.effortBadge, { backgroundColor: move.effort === 'low' ? colors.mintDim : move.effort === 'high' ? colors.coralDim : colors.skyDim }]}>
                <Text style={[s.effortText, { color: move.effort === 'low' ? colors.mint : move.effort === 'high' ? colors.coral : colors.sky }]}>{move.effort}</Text>
              </View>
            </View>
            {isExpanded && move.details && (
              <View style={s.details}>
                {move.details.strategy && <Text style={s.detailText}>{move.details.strategy}</Text>}
                {move.details.steps && move.details.steps.map((step: string, j: number) => (
                  <Text key={j} style={s.step}>{'\u2022'} {step}</Text>
                ))}
                {move.details.effect && <Text style={s.effect}>{move.details.effect}</Text>}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Debt help */}
      <Text style={s.section}>Need debt help?</Text>
      <View style={s.card}>
        <Text style={s.debtIntro}>Free, confidential UK debt advice:</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.stepchange.org/start.aspx')}>
          <Text style={s.link}>StepChange</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.citizensadvice.org.uk/debt-and-money/')}>
          <Text style={s.link}>Citizens Advice</Text>
        </TouchableOpacity>
        <Text style={s.debtHint}>You can also email your credit card provider to request a hardship period.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: 40 },
  empty: { fontFamily: fonts.mono, fontSize: 14, color: colors.dim, textAlign: 'center', marginTop: 100 },
  title: { fontFamily: fonts.mono, fontSize: 22, color: colors.text, marginBottom: spacing.xs },
  goalsText: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, marginBottom: spacing.xs },
  surplus: { fontFamily: fonts.mono, fontSize: 13, color: colors.text2, marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  moveHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  moveNum: { fontFamily: fonts.mono, fontSize: 16, color: colors.accent, fontWeight: '700', width: 24 },
  moveAction: { fontFamily: fonts.mono, fontSize: 14, color: colors.text, marginBottom: 4 },
  moveImpact: { fontFamily: fonts.mono, fontSize: 12, color: colors.mint },
  effortBadge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  effortText: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '600' },
  details: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  detailText: { fontFamily: fonts.mono, fontSize: 12, color: colors.text2, marginBottom: spacing.sm, lineHeight: 18 },
  step: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim, marginBottom: 4, paddingLeft: spacing.sm },
  effect: { fontFamily: fonts.mono, fontSize: 12, color: colors.accent, marginTop: spacing.sm, fontStyle: 'italic' },
  section: { fontFamily: fonts.mono, fontSize: 14, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  debtIntro: { fontFamily: fonts.mono, fontSize: 12, color: colors.text2, marginBottom: spacing.sm },
  link: { fontFamily: fonts.mono, fontSize: 13, color: colors.sky, marginBottom: spacing.xs, textDecorationLine: 'underline' },
  debtHint: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, marginTop: spacing.sm },
});
