import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, spacing, radius } from '@/theme';

export default function Results() {
  const router = useRouter();
  const result = (globalThis as any).__bocyResult;

  if (!result) {
    return (
      <View style={s.container}>
        <Text style={s.empty}>No analysis data. Please run an analysis first.</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.replace('/(main)/connect')}>
          <Text style={s.btnText}>Connect bank</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { profile, archetype, topMove, allMoves, goalContext, decisionScore } = result;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      {/* Financial Picture */}
      <Text style={s.section}>Your financial picture</Text>
      <View style={s.card}>
        <Row label="Monthly income" value={`\u00A3${Math.round(profile.monthly.income)}`} color={colors.mint} />
        <Row label="Monthly spending" value={`\u00A3${Math.round(profile.monthly.spending)}`} color={colors.coral} />
        <Row label="Surplus" value={`\u00A3${Math.round(profile.monthly.surplus)}`} color={profile.monthly.surplus >= 0 ? colors.mint : colors.coral} />
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Budget reality</Text>
        <Row label="Non-discretionary" value={`\u00A3${Math.round(profile.budgetReality.nonDiscretionary.total)}`} color={colors.dim} />
        <Row label="Discretionary" value={`\u00A3${Math.round(profile.budgetReality.discretionary.total)}`} color={colors.sky} />
      </View>

      {/* Top Recommendation */}
      {topMove && (
        <>
          <Text style={s.section}>Top recommendation</Text>
          <View style={[s.card, { borderColor: colors.accent, borderWidth: 1 }]}>
            <Text style={s.moveAction}>{topMove.action}</Text>
            <Text style={s.moveImpact}>Saves \u00A3{topMove.monthlySaving}/month (\u00A3{topMove.annualImpact}/year)</Text>
            {topMove.details?.strategy && <Text style={s.moveDetail}>{topMove.details.strategy}</Text>}
          </View>
        </>
      )}

      {/* Goal trajectory */}
      {goalContext && (
        <View style={s.card}>
          <Text style={s.cardLabel}>{goalContext.goal.label}</Text>
          <Text style={s.trajectoryText}>{goalContext.insight}</Text>
        </View>
      )}

      {/* More moves */}
      {allMoves && allMoves.length > 1 && (
        <>
          <Text style={s.section}>More recommendations</Text>
          {allMoves.slice(1).map((move: any, i: number) => (
            <View key={i} style={s.card}>
              <View style={s.moveRow}>
                <Text style={s.moveAction}>{move.action}</Text>
                <View style={[s.effortBadge, { backgroundColor: move.effort === 'low' ? colors.mintDim : move.effort === 'high' ? colors.coralDim : colors.skyDim }]}>
                  <Text style={[s.effortText, { color: move.effort === 'low' ? colors.mint : move.effort === 'high' ? colors.coral : colors.sky }]}>{move.effort}</Text>
                </View>
              </View>
              <Text style={s.moveImpact}>\u00A3{move.monthlySaving}/month</Text>
            </View>
          ))}
        </>
      )}

      {/* Archetype */}
      <Text style={s.section}>Your financial profile</Text>
      <View style={s.card}>
        <Text style={[s.archetypeTitle, { color: archetype.color }]}>{archetype.emoji} {archetype.name}</Text>
        <Text style={s.archetypeDesc}>{archetype.description}</Text>
      </View>

      {/* Decision score */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Decision score</Text>
        <Text style={[s.score, { color: decisionScore.score >= 60 ? colors.mint : decisionScore.score >= 40 ? colors.accent : colors.coral }]}>
          {decisionScore.score}/100
        </Text>
        <Text style={s.verdict}>{decisionScore.verdict}</Text>
      </View>

      {/* Actions */}
      <TouchableOpacity style={s.btn} onPress={() => router.replace('/(main)/(tabs)')}>
        <Text style={s.btnText}>Go to Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push('/(main)/connect')}>
        <Text style={s.secondaryText}>Run new analysis</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  empty: { fontFamily: fonts.mono, fontSize: 14, color: colors.dim, textAlign: 'center', marginTop: 100 },
  section: { fontFamily: fonts.mono, fontSize: 16, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardLabel: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  rowLabel: { fontFamily: fonts.mono, fontSize: 13, color: colors.text2 },
  rowValue: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '600' },
  moveAction: { fontFamily: fonts.mono, fontSize: 14, color: colors.text, marginBottom: spacing.xs },
  moveImpact: { fontFamily: fonts.mono, fontSize: 12, color: colors.mint },
  moveDetail: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim, marginTop: spacing.xs },
  moveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  effortBadge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  effortText: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '600' },
  trajectoryText: { fontFamily: fonts.mono, fontSize: 12, color: colors.text2 },
  archetypeTitle: { fontFamily: fonts.mono, fontSize: 18, marginBottom: spacing.xs },
  archetypeDesc: { fontFamily: fonts.mono, fontSize: 12, color: colors.text2, lineHeight: 18 },
  score: { fontFamily: fonts.mono, fontSize: 32, fontWeight: '700', textAlign: 'center' },
  verdict: { fontFamily: fonts.mono, fontSize: 13, color: colors.dim, textAlign: 'center', marginTop: spacing.xs },
  btn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg,
  },
  btnText: { fontFamily: fonts.mono, fontSize: 15, color: colors.bg, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm,
  },
  secondaryText: { fontFamily: fonts.mono, fontSize: 14, color: colors.text },
});
