import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { confirm } from '../../lib/confirm';

export default function ResultsScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showModify, setShowModify] = useState(false);
  const [committed, setCommitted] = useState(false);

  const result = (globalThis as any).__bocyResult;
  const goals = (globalThis as any).__bocyGoals;

  // Use cached move result from processing pipeline (already UKPF-ranked + Claude-refined)
  const moveResult = (globalThis as any).__bocyMoveResult || null;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!result) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorContainer}>
          <Text style={s.errorText}>No analysis data found.</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => router.replace('/(main)/connect' as any)}
          >
            <Text style={s.retryBtnText}>Start over</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { profile, archetype, decisionScore } = result;
  const m = profile.monthly;
  const br = profile.budgetReality;

  const formatCurrency = (n: number) => {
    if (n >= 1000) return `£${(n / 1000).toFixed(1)}k`;
    return `£${Math.round(n)}`;
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Your Financial Picture</Text>
          </View>

          {/* Income Summary Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Monthly Income</Text>
            <Text style={s.bigNumber}>{formatCurrency(m.income)}</Text>
            {profile.incomeSources?.length > 0 && (
              <View style={s.incomeSourceList}>
                {profile.incomeSources.slice(0, 4).map((src: any, i: number) => (
                  <View key={i} style={s.incomeSourceRow}>
                    <View style={s.incomeSourceDot} />
                    <Text style={s.incomeSourceName} numberOfLines={1}>
                      {src.source}
                    </Text>
                    <Text style={s.incomeSourceFreq}>{src.frequency}</Text>
                    <Text style={s.incomeSourceAmount}>{formatCurrency(src.monthly)}/mo</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Budget Reality Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Your Budget Reality</Text>

            {/* Summary bar */}
            <View style={s.budgetSummary}>
              <View style={s.budgetItem}>
                <Text style={s.budgetLabel}>Non-negotiable</Text>
                <Text style={[s.budgetValue, { color: theme.colors.coral }]}>
                  {formatCurrency(br.nonDiscretionary.total)}
                </Text>
              </View>
              <View style={s.budgetDivider} />
              <View style={s.budgetItem}>
                <Text style={s.budgetLabel}>Lifestyle</Text>
                <Text style={[s.budgetValue, { color: theme.colors.sky }]}>
                  {formatCurrency(br.discretionary.total)}
                </Text>
              </View>
              <View style={s.budgetDivider} />
              <View style={s.budgetItem}>
                <Text style={s.budgetLabel}>Surplus</Text>
                <Text style={[s.budgetValue, { color: m.surplus >= 0 ? theme.colors.mint : theme.colors.coral }]}>
                  {m.surplus >= 0 ? '+' : ''}{formatCurrency(m.surplus)}
                </Text>
              </View>
            </View>

            {/* Non-discretionary breakdown */}
            <Text style={s.sectionLabel}>Non-negotiable</Text>
            {br.nonDiscretionary.items.slice(0, 6).map((item: any, i: number) => {
              const isExpanded = expandedCat === `nd-${item.category}`;
              return (
                <View key={i}>
                  <TouchableOpacity
                    style={s.catRow}
                    onPress={() => setExpandedCat(isExpanded ? null : `nd-${item.category}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.catName}>{item.category}</Text>
                    <Text style={[s.catAmount, { color: theme.colors.coral }]}>
                      {formatCurrency(item.monthly)}/mo
                    </Text>
                    <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={14} color={theme.colors.muted} />
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

            {/* Discretionary breakdown */}
            <Text style={[s.sectionLabel, { marginTop: 16 }]}>Lifestyle</Text>
            {br.discretionary.items.slice(0, 6).map((item: any, i: number) => {
              const isExpanded = expandedCat === `d-${item.category}`;
              return (
                <View key={i}>
                  <TouchableOpacity
                    style={s.catRow}
                    onPress={() => setExpandedCat(isExpanded ? null : `d-${item.category}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.catName}>{item.category}</Text>
                    <Text style={[s.catAmount, { color: theme.colors.sky }]}>
                      {formatCurrency(item.monthly)}/mo
                    </Text>
                    <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={14} color={theme.colors.muted} />
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
          </View>

          {/* #1 Move Hero Card */}
          {moveResult?.topMove && (
            <View style={s.moveCard}>
              <View style={s.moveHeader}>
                <Text style={s.moveLabel}>TOP RECOMMENDATION</Text>
                {moveResult.goal && (
                  <Text style={s.moveGoalTag}>{moveResult.goal.label}</Text>
                )}
              </View>

              <Text style={s.moveAction}>{moveResult.topMove.action}</Text>

              {/* Impact metrics */}
              <View style={s.moveMetrics}>
                <View style={s.moveMetric}>
                  <Text style={s.moveMetricValue}>
                    {formatCurrency(moveResult.topMove.annualImpact)}
                  </Text>
                  <Text style={s.moveMetricLabel}>annual impact</Text>
                </View>
                {moveResult.monthlySaving > 0 && (
                  <View style={s.moveMetric}>
                    <Text style={s.moveMetricValue}>
                      {formatCurrency(moveResult.monthlySaving)}
                    </Text>
                    <Text style={s.moveMetricLabel}>per month</Text>
                  </View>
                )}
                {moveResult.monthsSaved && (
                  <View style={s.moveMetric}>
                    <Text style={s.moveMetricValue}>{moveResult.monthsSaved}</Text>
                    <Text style={s.moveMetricLabel}>months saved</Text>
                  </View>
                )}
              </View>

              {/* Goal insight */}
              {moveResult.insight && (
                <View style={s.insightBox}>
                  <Text style={s.insightText}>{moveResult.insight}</Text>
                </View>
              )}

              {/* Timeline comparison */}
              {moveResult.currentTrajectory && moveResult.newTrajectory && (
                <View style={s.timelineBox}>
                  <View style={s.timelineRow}>
                    <Ionicons name="ellipse-outline" size={14} color={theme.colors.dim} style={{ width: 20, textAlign: 'center' }} />
                    <Text style={s.timelineLabel}>Without changes</Text>
                    <Text style={[s.timelineVal, { color: theme.colors.dim }]}>
                      {moveResult.currentTrajectory} months
                    </Text>
                  </View>
                  <View style={s.timelineRow}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.mint} style={{ width: 20, textAlign: 'center' }} />
                    <Text style={s.timelineLabel}>With this move</Text>
                    <Text style={[s.timelineVal, { color: theme.colors.mint }]}>
                      {moveResult.newTrajectory} months
                    </Text>
                  </View>
                </View>
              )}

              {/* Commit / Modify buttons */}
              <View style={s.moveActions}>
                <TouchableOpacity
                  style={[s.approveBtn, committed && { backgroundColor: 'rgba(114,232,176,0.15)', borderWidth: 1, borderColor: theme.colors.mint }]}
                  onPress={() => {
                    setCommitted(true);
                    confirm("You're on it!", "We've noted this as a committed action. We'll track your progress in future analyses.", () => {});
                  }}
                  activeOpacity={0.8}
                  disabled={committed}
                >
                  <Ionicons name={committed ? 'checkmark-circle' : 'flash'} size={16} color={committed ? theme.colors.mint : theme.colors.bg} style={{ marginRight: 6 }} />
                  <Text style={[s.approveBtnText, committed && { color: theme.colors.mint }]}>{committed ? 'Committed' : "I'll do this"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.modifyBtn}
                  onPress={() => setShowModify(!showModify)}
                  activeOpacity={0.8}
                >
                  <Text style={s.modifyBtnText}>{showModify ? 'Hide details' : 'Modify'}</Text>
                </TouchableOpacity>
              </View>

              {/* Modify detail panel */}
              {showModify && moveResult.topMove.details && (
                <View style={s.modifyPanel}>
                  <Text style={s.modifyTitle}>{moveResult.topMove.details.strategy}</Text>
                  <Text style={s.modifyReasoning}>{moveResult.topMove.details.reasoning}</Text>

                  {moveResult.topMove.details.items?.length > 0 && (
                    <View style={s.modifyItems}>
                      <Text style={s.modifyItemsTitle}>Breakdown</Text>
                      {moveResult.topMove.details.items.map((item: any, i: number) => (
                        <View key={i} style={s.modifyItemRow}>
                          <Text style={s.modifyItemName}>{item.name}</Text>
                          <Text style={s.modifyItemAmount}>
                            {formatCurrency(item.amount)}/{item.frequency}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {moveResult.topMove.details.steps?.length > 0 && (
                    <View style={s.modifySteps}>
                      <Text style={s.modifyItemsTitle}>Execution steps</Text>
                      {moveResult.topMove.details.steps.map((step: string, i: number) => (
                        <View key={i} style={s.modifyStepRow}>
                          <Text style={s.modifyStepNum}>{i + 1}</Text>
                          <Text style={s.modifyStepText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {moveResult.topMove.details.effect && (
                    <View style={s.modifyEffect}>
                      <Text style={s.modifyEffectLabel}>Effect on finances</Text>
                      <Text style={s.modifyEffectText}>{moveResult.topMove.details.effect}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Other Moves */}
          {moveResult && moveResult.allScored?.length > 1 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>More Recommendations</Text>
              {moveResult.allScored.slice(1).map((scored: any, i: number) => (
                <View key={i} style={s.otherMoveRow}>
                  <View style={s.otherMoveInfo}>
                    <Text style={s.otherMoveAction} numberOfLines={2}>{scored.move.action}</Text>
                    <Text style={s.otherMoveImpact}>
                      {formatCurrency(scored.move.annualImpact)}/yr
                      {scored.monthlySaving > 0 ? ` (${formatCurrency(scored.monthlySaving)}/mo)` : ''}
                    </Text>
                  </View>
                  <View style={[
                    s.effortBadge,
                    scored.move.effort === 'low' && s.effortLow,
                    scored.move.effort === 'high' && s.effortHigh,
                  ]}>
                    <Text style={[
                      s.effortText,
                      scored.move.effort === 'low' && s.effortTextLow,
                      scored.move.effort === 'high' && s.effortTextHigh,
                    ]}>
                      {scored.move.effort}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Personality Card (secondary insight) */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Your Financial Profile</Text>
            <View style={s.personalityHeader}>
              <Text style={s.personalityName}>{archetype?.name || 'Balanced Realist'}</Text>
              <View style={s.scoreCircle}>
                <Text style={s.scoreValue}>{decisionScore?.score || 0}</Text>
                <Text style={s.scoreLabel}>score</Text>
              </View>
            </View>
            <Text style={s.personalityDesc}>{archetype?.desc || ''}</Text>
            {decisionScore?.verdict && (
              <Text style={s.verdict}>{decisionScore.verdict}</Text>
            )}
          </View>

          {/* Decision Score Breakdown */}
          {decisionScore?.breakdown?.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Decision Score Breakdown</Text>
              {decisionScore.breakdown.map((item: any, i: number) => (
                <View key={i} style={s.scoreRow}>
                  <View style={s.scoreRowInfo}>
                    <Text style={s.scoreRowLabel}>{item.label}</Text>
                    <Text style={s.scoreRowDetail}>{item.detail}</Text>
                  </View>
                  <View style={s.scoreBarWrap}>
                    <View style={[s.scoreBar, { width: `${Math.min(item.score, 100)}%` as any }]} />
                  </View>
                  <Text style={s.scoreRowValue}>{item.score}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <View style={s.bottomActions}>
            <TouchableOpacity
              style={s.goHomeBtn}
              onPress={() => router.replace('/(main)/(tabs)' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.goHomeBtnText}>Go to Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.newAnalysisBtn}
              onPress={() => router.replace('/(main)/connect' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.newAnalysisBtnText}>New analysis</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
  },

  // Cards
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: theme.colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Income
  bigNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'SpaceMono',
  },
  incomeSourceList: {
    marginTop: 16,
    gap: 10,
  },
  incomeSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incomeSourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.mint,
  },
  incomeSourceName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text2,
  },
  incomeSourceFreq: {
    fontSize: 11,
    color: theme.colors.muted,
    fontFamily: 'SpaceMono',
  },
  incomeSourceAmount: {
    fontSize: 14,
    color: theme.colors.mint,
    fontFamily: 'SpaceMono',
    minWidth: 80,
    textAlign: 'right',
  },

  // Budget Reality
  budgetSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: theme.radius.md,
  },
  budgetItem: {
    flex: 1,
    alignItems: 'center',
  },
  budgetDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  budgetLabel: {
    fontSize: 11,
    color: theme.colors.dim,
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.dim,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  catName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text2,
  },
  catAmount: {
    fontSize: 14,
    fontFamily: 'SpaceMono',
    marginRight: 8,
  },
  expandArrow: {
    fontSize: 12,
    color: theme.colors.muted,
    width: 16,
    textAlign: 'center',
  },
  txList: {
    paddingLeft: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 4,
    marginBottom: 4,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  txDesc: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.dim,
    marginRight: 8,
  },
  txAmt: {
    fontSize: 13,
    color: theme.colors.dim,
    fontFamily: 'SpaceMono',
  },
  txMore: {
    fontSize: 12,
    color: theme.colors.muted,
    paddingVertical: 4,
  },

  // Move Card
  moveCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 16,
  },
  moveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moveLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: theme.colors.accent,
    letterSpacing: 2,
  },
  moveGoalTag: {
    fontSize: 11,
    color: theme.colors.mint,
    fontFamily: 'SpaceMono',
    backgroundColor: theme.colors.mintDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  moveAction: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 26,
    marginBottom: 16,
  },
  moveMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  moveMetric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: theme.radius.sm,
  },
  moveMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.accent,
    fontFamily: 'SpaceMono',
  },
  moveMetricLabel: {
    fontSize: 11,
    color: theme.colors.dim,
    marginTop: 2,
  },
  insightBox: {
    backgroundColor: 'rgba(232,200,114,0.06)',
    borderRadius: theme.radius.sm,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  insightText: {
    fontSize: 14,
    color: theme.colors.text2,
    lineHeight: 20,
  },
  timelineBox: {
    gap: 8,
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineDot: {
    fontSize: 16,
    color: theme.colors.dim,
    fontFamily: 'SpaceMono',
    width: 20,
    textAlign: 'center',
  },
  timelineLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.dim,
  },
  timelineVal: {
    fontSize: 14,
    fontFamily: 'SpaceMono',
    fontWeight: '600',
  },

  // Approve / Modify
  moveActions: {
    flexDirection: 'row',
    gap: 12,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  approveBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.bg,
    letterSpacing: 1,
  },
  modifyBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: 14,
    alignItems: 'center',
  },
  modifyBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
    letterSpacing: 1,
  },

  // Modify panel
  modifyPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modifyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 10,
  },
  modifyReasoning: {
    fontSize: 14,
    color: theme.colors.text2,
    lineHeight: 21,
    marginBottom: 16,
  },
  modifyItems: {
    marginBottom: 16,
  },
  modifyItemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.dim,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modifyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modifyItemName: {
    fontSize: 14,
    color: theme.colors.text2,
  },
  modifyItemAmount: {
    fontSize: 14,
    color: theme.colors.accent,
    fontFamily: 'SpaceMono',
  },
  modifySteps: {
    marginBottom: 16,
  },
  modifyStepRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
  },
  modifyStepNum: {
    fontSize: 13,
    color: theme.colors.accent,
    fontFamily: 'SpaceMono',
    width: 20,
    textAlign: 'center',
  },
  modifyStepText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text2,
    lineHeight: 20,
  },
  modifyEffect: {
    backgroundColor: 'rgba(114,232,176,0.06)',
    borderRadius: theme.radius.sm,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.mint,
  },
  modifyEffectLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.mint,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modifyEffectText: {
    fontSize: 14,
    color: theme.colors.text2,
    lineHeight: 20,
  },

  // Other moves
  otherMoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  otherMoveInfo: {
    flex: 1,
  },
  otherMoveAction: {
    fontSize: 14,
    color: theme.colors.text2,
    lineHeight: 20,
  },
  otherMoveImpact: {
    fontSize: 12,
    color: theme.colors.dim,
    fontFamily: 'SpaceMono',
    marginTop: 2,
  },
  effortBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  effortLow: {
    backgroundColor: theme.colors.mintDim,
  },
  effortHigh: {
    backgroundColor: theme.colors.coralDim,
  },
  effortText: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
    color: theme.colors.dim,
  },
  effortTextLow: {
    color: theme.colors.mint,
  },
  effortTextHigh: {
    color: theme.colors.coral,
  },

  // Personality
  personalityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  personalityName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.accent,
    fontFamily: 'SpaceMono',
  },
  scoreLabel: {
    fontSize: 9,
    color: theme.colors.dim,
  },
  personalityDesc: {
    fontSize: 14,
    color: theme.colors.dim,
    lineHeight: 21,
  },
  verdict: {
    fontSize: 14,
    color: theme.colors.text2,
    marginTop: 12,
    fontStyle: 'italic',
  },

  // Score breakdown
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  scoreRowInfo: {
    flex: 1,
  },
  scoreRowLabel: {
    fontSize: 13,
    color: theme.colors.text2,
    fontWeight: '500',
  },
  scoreRowDetail: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 1,
  },
  scoreBarWrap: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
  scoreRowValue: {
    width: 28,
    fontSize: 13,
    fontFamily: 'SpaceMono',
    color: theme.colors.accent,
    textAlign: 'right',
  },

  // Bottom
  bottomActions: {
    marginTop: 8,
    gap: 12,
  },
  goHomeBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
  },
  goHomeBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.bg,
    letterSpacing: 1,
  },
  newAnalysisBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
  },
  newAnalysisBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    color: theme.colors.dim,
    letterSpacing: 1,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.dim,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  retryBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.bg,
  },
});
