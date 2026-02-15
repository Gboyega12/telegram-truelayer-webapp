import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../theme';
import { supabase } from '../../../lib/supabase';
import { confirm } from '../../../lib/confirm';

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [latest, setLatest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showModify, setShowModify] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserName(user.user_metadata?.full_name || '');

      const { data } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setLatest(data[0]);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n: number) => {
    if (Math.abs(n) >= 1000) return `\u00A3${(n / 1000).toFixed(1)}k`;
    return `\u00A3${Math.round(Math.abs(n))}`;
  };

  const firstName = userName.split(' ')[0] || 'there';

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const income = latest?.monthly_income || 0;
  const spending = latest?.monthly_spending || 0;
  const surplus = latest?.surplus || 0;
  const incomeSources: any[] = latest?.income_sources || [];
  const nonDisc = latest?.non_discretionary || { total: 0, items: [] };
  const disc = latest?.discretionary || { total: 0, items: [] };
  const topMove = latest?.top_move;
  const allMoves: any[] = latest?.all_moves || [];
  const goalContext = latest?.goal_context;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.greeting}>Hi, {firstName}</Text>
          <TouchableOpacity
            style={s.profileIcon}
            onPress={() => router.push('/(main)/profile' as any)}
            activeOpacity={0.7}
          >
            <Text style={s.profileInitial}>{firstName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {!latest ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>Welcome aboard</Text>
            <Text style={s.emptySubtext}>
              Connect your bank or upload a statement to get your first personalised financial analysis.
            </Text>
            <TouchableOpacity
              style={s.startBtn}
              onPress={() => router.push('/(main)/connect' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.startBtnText}>Start your analysis</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ===== Card 1: Monthly Income ===== */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Monthly Income</Text>
              <Text style={s.bigNumber}>{formatCurrency(income)}</Text>
              {incomeSources.length > 0 && (
                <View style={s.incomeSourceList}>
                  {incomeSources.slice(0, 4).map((src: any, i: number) => (
                    <View key={i} style={s.incomeSourceRow}>
                      <View style={s.incomeSourceDot} />
                      <Text style={s.incomeSourceName} numberOfLines={1}>{src.source}</Text>
                      <Text style={s.incomeSourceFreq}>{src.frequency}</Text>
                      <Text style={s.incomeSourceAmount}>{formatCurrency(src.monthly)}/mo</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ===== Card 2: Budget Reality ===== */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Your Budget Reality</Text>

              {/* Summary row */}
              <View style={s.budgetSummary}>
                <View style={s.budgetItem}>
                  <Text style={s.budgetLabel}>Non-negotiable</Text>
                  <Text style={[s.budgetValue, { color: theme.colors.coral }]}>
                    {formatCurrency(nonDisc.total || 0)}
                  </Text>
                </View>
                <View style={s.budgetDivider} />
                <View style={s.budgetItem}>
                  <Text style={s.budgetLabel}>Lifestyle</Text>
                  <Text style={[s.budgetValue, { color: theme.colors.sky }]}>
                    {formatCurrency(disc.total || 0)}
                  </Text>
                </View>
                <View style={s.budgetDivider} />
                <View style={s.budgetItem}>
                  <Text style={s.budgetLabel}>Surplus</Text>
                  <Text style={[s.budgetValue, { color: surplus >= 0 ? theme.colors.mint : theme.colors.coral }]}>
                    {surplus >= 0 ? '+' : '-'}{formatCurrency(Math.abs(surplus))}
                  </Text>
                </View>
              </View>

              {/* Non-discretionary breakdown */}
              {nonDisc.items?.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>Non-negotiable</Text>
                  {nonDisc.items.slice(0, 6).map((item: any, i: number) => {
                    const key = `nd-${item.category}`;
                    const isExpanded = expandedCat === key;
                    return (
                      <View key={i}>
                        <TouchableOpacity
                          style={s.catRow}
                          onPress={() => setExpandedCat(isExpanded ? null : key)}
                          activeOpacity={0.7}
                        >
                          <Text style={s.catName}>{item.category}</Text>
                          <Text style={[s.catAmount, { color: theme.colors.coral }]}>
                            {formatCurrency(item.monthly)}/mo
                          </Text>
                          <Text style={s.expandArrow}>{isExpanded ? '\u25BE' : '\u25B8'}</Text>
                        </TouchableOpacity>
                        {isExpanded && item.txs?.length > 0 && (
                          <View style={s.txList}>
                            {item.txs.slice(0, 8).map((tx: any, j: number) => (
                              <View key={j} style={s.txRow}>
                                <Text style={s.txDesc} numberOfLines={1}>{tx.merchant || tx.description}</Text>
                                <Text style={s.txAmt}>{formatCurrency(Math.abs(tx.amount))}</Text>
                              </View>
                            ))}
                            {item.txs.length > 8 && (
                              <Text style={s.txMore}>+{item.txs.length - 8} more</Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}

              {/* Discretionary breakdown */}
              {disc.items?.length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 16 }]}>Lifestyle</Text>
                  {disc.items.slice(0, 6).map((item: any, i: number) => {
                    const key = `d-${item.category}`;
                    const isExpanded = expandedCat === key;
                    return (
                      <View key={i}>
                        <TouchableOpacity
                          style={s.catRow}
                          onPress={() => setExpandedCat(isExpanded ? null : key)}
                          activeOpacity={0.7}
                        >
                          <Text style={s.catName}>{item.category}</Text>
                          <Text style={[s.catAmount, { color: theme.colors.sky }]}>
                            {formatCurrency(item.monthly)}/mo
                          </Text>
                          <Text style={s.expandArrow}>{isExpanded ? '\u25BE' : '\u25B8'}</Text>
                        </TouchableOpacity>
                        {isExpanded && item.txs?.length > 0 && (
                          <View style={s.txList}>
                            {item.txs.slice(0, 8).map((tx: any, j: number) => (
                              <View key={j} style={s.txRow}>
                                <Text style={s.txDesc} numberOfLines={1}>{tx.merchant || tx.description}</Text>
                                <Text style={s.txAmt}>{formatCurrency(Math.abs(tx.amount))}</Text>
                              </View>
                            ))}
                            {item.txs.length > 8 && (
                              <Text style={s.txMore}>+{item.txs.length - 8} more</Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
            </View>

            {/* ===== Card 3: Your Top Money Moves ===== */}
            {topMove?.action && (
              <View style={s.moveCard}>
                <View style={s.moveHeader}>
                  <Text style={s.cardTitle}>Top Recommendation</Text>
                  {goalContext?.ukpfPriority?.label && (
                    <View style={s.priorityBadge}>
                      <Text style={s.priorityBadgeText}>
                        Priority: {goalContext.ukpfPriority.label}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={s.moveAction}>{topMove.action}</Text>

                {/* Goal trajectory insight */}
                {goalContext?.insight && (
                  <View style={s.insightBox}>
                    <Text style={s.insightText}>{goalContext.insight}</Text>
                  </View>
                )}

                {/* Impact metrics */}
                <View style={s.moveMetrics}>
                  {topMove.annualImpact > 0 && (
                    <View style={s.moveMetric}>
                      <Text style={s.moveMetricValue}>{formatCurrency(topMove.annualImpact)}</Text>
                      <Text style={s.moveMetricLabel}>annual impact</Text>
                    </View>
                  )}
                  {topMove.monthlySaving > 0 && (
                    <View style={s.moveMetric}>
                      <Text style={s.moveMetricValue}>{formatCurrency(topMove.monthlySaving)}</Text>
                      <Text style={s.moveMetricLabel}>per month</Text>
                    </View>
                  )}
                  {topMove.effort && (
                    <View style={s.moveMetric}>
                      <Text style={s.moveMetricValue}>{topMove.effort}</Text>
                      <Text style={s.moveMetricLabel}>effort</Text>
                    </View>
                  )}
                </View>

                {/* Approve / Modify */}
                <View style={s.moveActions}>
                  <TouchableOpacity
                    style={s.approveBtn}
                    onPress={() =>
                      confirm(
                        'Coming soon',
                        'Soon you\'ll be able to approve recommendations and we\'ll help set up automatic transfers, payment adjustments, and reminders for you.',
                        () => {},
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={s.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.modifyBtn}
                    onPress={() => setShowModify(!showModify)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.modifyBtnText}>{showModify ? 'Hide details' : 'Modify'}</Text>
                  </TouchableOpacity>
                </View>

                {showModify && topMove.details && (
                  <View style={s.modifyPanel}>
                    {topMove.details.strategy && (
                      <Text style={s.modifyTitle}>{topMove.details.strategy}</Text>
                    )}
                    {topMove.details.reasoning && (
                      <Text style={s.modifyReasoning}>{topMove.details.reasoning}</Text>
                    )}
                    {topMove.details.items?.length > 0 && (
                      <View style={s.modifyItems}>
                        <Text style={s.modifySectionTitle}>Breakdown</Text>
                        {topMove.details.items.map((item: any, i: number) => (
                          <View key={i} style={s.modifyItemRow}>
                            <Text style={s.modifyItemName}>{item.name}</Text>
                            <Text style={s.modifyItemAmount}>{formatCurrency(item.amount)}/{item.frequency}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {topMove.details.steps?.length > 0 && (
                      <View style={s.modifySteps}>
                        <Text style={s.modifySectionTitle}>Steps</Text>
                        {topMove.details.steps.map((step: string, i: number) => (
                          <View key={i} style={s.modifyStepRow}>
                            <Text style={s.modifyStepNum}>{i + 1}</Text>
                            <Text style={s.modifyStepText}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {topMove.details.effect && (
                      <View style={s.modifyEffect}>
                        <Text style={s.modifyEffectLabel}>Effect on finances</Text>
                        <Text style={s.modifyEffectText}>{topMove.details.effect}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Other moves */}
            {allMoves.length > 1 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>More Recommendations</Text>
                {allMoves.slice(1, 4).map((move: any, i: number) => (
                  <View key={i} style={s.otherMoveRow}>
                    <View style={s.otherMoveBadge}>
                      <Text style={s.otherMoveBadgeText}>{i + 2}</Text>
                    </View>
                    <View style={s.otherMoveInfo}>
                      <Text style={s.otherMoveAction} numberOfLines={2}>{move.action}</Text>
                      {(move.monthlySaving > 0 || move.annualImpact > 0) && (
                        <Text style={s.otherMoveImpact}>
                          {move.monthlySaving > 0 ? `${formatCurrency(move.monthlySaving)}/mo` : `${formatCurrency(move.annualImpact)}/yr`}
                        </Text>
                      )}
                    </View>
                    {move.effort && (
                      <View style={[s.effortBadge, move.effort === 'low' ? s.effortLow : s.effortHigh]}>
                        <Text style={[s.effortText, move.effort === 'low' ? s.effortTextLow : s.effortTextHigh]}>
                          {move.effort}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* New analysis */}
            <TouchableOpacity
              style={s.newBtn}
              onPress={() => router.push('/(main)/connect' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.newBtnText}>Run new analysis</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  profileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accentDim, justifyContent: 'center', alignItems: 'center' },
  profileInitial: { fontFamily: 'SpaceMono', fontSize: 16, fontWeight: '700', color: theme.colors.accent },

  // Empty
  emptyWrap: { paddingVertical: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: theme.colors.dim, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  startBtn: { backgroundColor: theme.colors.accent, borderRadius: theme.radius.md, paddingHorizontal: 28, paddingVertical: 14 },
  startBtnText: { fontFamily: 'SpaceMono', fontSize: 14, fontWeight: '700', color: theme.colors.bg },

  // Cards
  card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: 20, marginBottom: 16 },
  cardTitle: { fontFamily: 'SpaceMono', fontSize: 11, color: theme.colors.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 },

  // Income
  bigNumber: { fontSize: 36, fontWeight: '700', color: theme.colors.text, fontFamily: 'SpaceMono' },
  incomeSourceList: { marginTop: 16, gap: 10 },
  incomeSourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  incomeSourceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.mint },
  incomeSourceName: { flex: 1, fontSize: 14, color: theme.colors.text2 },
  incomeSourceFreq: { fontSize: 11, color: theme.colors.muted, fontFamily: 'SpaceMono' },
  incomeSourceAmount: { fontSize: 14, color: theme.colors.mint, fontFamily: 'SpaceMono', minWidth: 80, textAlign: 'right' },

  // Budget
  budgetSummary: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: theme.radius.md },
  budgetItem: { flex: 1, alignItems: 'center' },
  budgetDivider: { width: 1, height: 32, backgroundColor: theme.colors.border },
  budgetLabel: { fontSize: 11, color: theme.colors.dim, marginBottom: 4 },
  budgetValue: { fontSize: 18, fontWeight: '700', fontFamily: 'SpaceMono' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  catName: { flex: 1, fontSize: 14, color: theme.colors.text2 },
  catAmount: { fontSize: 14, fontFamily: 'SpaceMono', marginRight: 8 },
  expandArrow: { fontSize: 12, color: theme.colors.muted, width: 16, textAlign: 'center' },
  txList: { paddingLeft: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 4, marginBottom: 4 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  txDesc: { flex: 1, fontSize: 13, color: theme.colors.dim, marginRight: 8 },
  txAmt: { fontSize: 13, color: theme.colors.dim, fontFamily: 'SpaceMono' },
  txMore: { fontSize: 12, color: theme.colors.muted, paddingVertical: 4 },

  // Move card
  moveCard: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.accent, borderRadius: theme.radius.lg, padding: 20, marginBottom: 16 },
  moveHeader: { marginBottom: 4 },
  priorityBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(232,200,114,0.1)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8, marginBottom: 4 },
  priorityBadgeText: { fontSize: 11, fontFamily: 'SpaceMono', color: theme.colors.accent, letterSpacing: 0.5 },
  moveAction: { fontSize: 18, fontWeight: '600', color: theme.colors.text, lineHeight: 26, marginBottom: 12 },
  insightBox: { backgroundColor: 'rgba(114,176,232,0.06)', borderRadius: theme.radius.sm, padding: 12, borderLeftWidth: 3, borderLeftColor: theme.colors.sky, marginBottom: 16 },
  insightText: { fontSize: 13, color: theme.colors.text2, lineHeight: 20 },
  moveMetrics: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  moveMetric: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: theme.radius.sm },
  moveMetricValue: { fontSize: 18, fontWeight: '700', color: theme.colors.accent, fontFamily: 'SpaceMono' },
  moveMetricLabel: { fontSize: 11, color: theme.colors.dim, marginTop: 2 },
  moveActions: { flexDirection: 'row', gap: 12 },
  approveBtn: { flex: 1, backgroundColor: theme.colors.accent, borderRadius: theme.radius.md, padding: 14, alignItems: 'center' },
  approveBtnText: { fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '700', color: theme.colors.bg, letterSpacing: 1 },
  modifyBtn: { flex: 1, borderWidth: 1, borderColor: theme.colors.accent, borderRadius: theme.radius.md, padding: 14, alignItems: 'center' },
  modifyBtnText: { fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '600', color: theme.colors.accent, letterSpacing: 1 },

  // Modify panel
  modifyPanel: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  modifyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 10 },
  modifyReasoning: { fontSize: 14, color: theme.colors.text2, lineHeight: 21, marginBottom: 16 },
  modifyItems: { marginBottom: 16 },
  modifySectionTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  modifyItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modifyItemName: { fontSize: 14, color: theme.colors.text2 },
  modifyItemAmount: { fontSize: 14, color: theme.colors.accent, fontFamily: 'SpaceMono' },
  modifySteps: { marginBottom: 16 },
  modifyStepRow: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  modifyStepNum: { fontSize: 13, color: theme.colors.accent, fontFamily: 'SpaceMono', width: 20, textAlign: 'center' },
  modifyStepText: { flex: 1, fontSize: 14, color: theme.colors.text2, lineHeight: 20 },
  modifyEffect: { backgroundColor: 'rgba(114,232,176,0.06)', borderRadius: theme.radius.sm, padding: 14, borderLeftWidth: 3, borderLeftColor: theme.colors.mint },
  modifyEffectLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.mint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  modifyEffectText: { fontSize: 14, color: theme.colors.text2, lineHeight: 20 },

  // Other moves
  otherMoveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  otherMoveBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.accentDim, justifyContent: 'center', alignItems: 'center' },
  otherMoveBadgeText: { fontFamily: 'SpaceMono', fontSize: 12, fontWeight: '700', color: theme.colors.accent },
  otherMoveInfo: { flex: 1 },
  otherMoveAction: { fontSize: 14, color: theme.colors.text2, lineHeight: 20 },
  otherMoveImpact: { fontSize: 12, color: theme.colors.dim, fontFamily: 'SpaceMono', marginTop: 2 },
  effortBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)' },
  effortLow: { backgroundColor: theme.colors.mintDim },
  effortHigh: { backgroundColor: theme.colors.coralDim },
  effortText: { fontSize: 11, fontFamily: 'SpaceMono', color: theme.colors.dim },
  effortTextLow: { color: theme.colors.mint },
  effortTextHigh: { color: theme.colors.coral },

  // New analysis
  newBtn: { borderWidth: 1, borderColor: theme.colors.accent, borderRadius: theme.radius.md, padding: 16, alignItems: 'center', marginTop: 4 },
  newBtnText: { fontFamily: 'SpaceMono', fontSize: 13, color: theme.colors.accent, fontWeight: '600', letterSpacing: 1 },
});
