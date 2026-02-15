import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, radius } from '@/theme';

export default function Home() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [goals, setGoals] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState('');
  const router = useRouter();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setName(user.user_metadata?.full_name?.split(' ')[0] || '');

    const { data: a } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setAnalysis(a);

    const { data: g } = await supabase.from('goals').select('*').eq('user_id', user.id).single();
    setGoals(g);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!analysis) {
    return (
      <View style={s.container}>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No analysis yet</Text>
          <Text style={s.emptyBody}>Connect your bank to get personalised money moves.</Text>
          <TouchableOpacity style={s.btn} onPress={() => router.push('/(main)/connect')}>
            <Text style={s.btnText}>Get started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const topMove = analysis.top_move;
  const allMoves = analysis.all_moves || [];

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Hi {name}</Text>
          <Text style={s.date}>{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
          <Ionicons name="person-circle-outline" size={32} color={colors.dim} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.card}>
        <View style={s.summaryRow}>
          <SummaryItem label="Income" value={`\u00A3${Math.round(analysis.monthly_income)}`} color={colors.mint} />
          <SummaryItem label="Spending" value={`\u00A3${Math.round(analysis.monthly_spending)}`} color={colors.coral} />
          <SummaryItem label="Surplus" value={`\u00A3${Math.round(analysis.surplus)}`} color={analysis.surplus >= 0 ? colors.mint : colors.coral} />
        </View>
      </View>

      {/* Budget */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Budget breakdown</Text>
        <Row label="Non-discretionary" value={`\u00A3${Math.round(analysis.non_discretionary?.total || 0)}`} />
        <Row label="Discretionary" value={`\u00A3${Math.round(analysis.discretionary?.total || 0)}`} />
      </View>

      {/* Top move */}
      {topMove && (
        <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: colors.accent }]}>
          <Text style={s.cardLabel}>Top move</Text>
          <Text style={s.moveAction}>{topMove.action}</Text>
          <Text style={s.moveImpact}>Saves \u00A3{topMove.monthlySaving}/month</Text>
          <TouchableOpacity style={s.commitBtn}>
            <Text style={s.commitText}>I'll do this</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* More moves */}
      {allMoves.length > 1 && (
        <>
          <Text style={s.section}>More recommendations</Text>
          {allMoves.slice(1, 4).map((move: any, i: number) => (
            <View key={i} style={s.card}>
              <Text style={s.moveAction}>{move.action}</Text>
              <View style={s.moveFooter}>
                <Text style={s.moveImpact}>\u00A3{move.monthlySaving}/month</Text>
                <View style={[s.effortBadge, { backgroundColor: move.effort === 'low' ? colors.mintDim : move.effort === 'high' ? colors.coralDim : colors.skyDim }]}>
                  <Text style={[s.effortText, { color: move.effort === 'low' ? colors.mint : move.effort === 'high' ? colors.coral : colors.sky }]}>{move.effort}</Text>
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.summaryItem}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: 40 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyTitle: { fontFamily: fonts.mono, fontSize: 20, color: colors.text, marginBottom: spacing.sm },
  emptyBody: { fontFamily: fonts.mono, fontSize: 13, color: colors.dim, textAlign: 'center', marginBottom: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  greeting: { fontFamily: fonts.mono, fontSize: 22, color: colors.text },
  date: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, marginBottom: spacing.sm, textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, marginBottom: 4 },
  summaryValue: { fontFamily: fonts.mono, fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  rowLabel: { fontFamily: fonts.mono, fontSize: 13, color: colors.text2 },
  rowValue: { fontFamily: fonts.mono, fontSize: 13, color: colors.text, fontWeight: '600' },
  section: { fontFamily: fonts.mono, fontSize: 14, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  moveAction: { fontFamily: fonts.mono, fontSize: 14, color: colors.text, marginBottom: spacing.xs },
  moveImpact: { fontFamily: fonts.mono, fontSize: 12, color: colors.mint },
  moveFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  effortBadge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  effortText: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '600' },
  commitBtn: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.sm, paddingVertical: 8, alignItems: 'center', marginTop: spacing.sm },
  commitText: { fontFamily: fonts.mono, fontSize: 12, color: colors.accent },
  btn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: spacing.xl, alignItems: 'center' },
  btnText: { fontFamily: fonts.mono, fontSize: 15, color: colors.bg, fontWeight: '700' },
});
