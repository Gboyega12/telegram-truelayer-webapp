import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { confirm } from '../../lib/confirm';

type Analysis = {
  id: string;
  created_at: string;
  archetype: string;
  decision_score: number;
  monthly_income: number;
  monthly_spending: number;
  surplus: number;
  non_discretionary: any;
  discretionary: any;
  top_move: any;
  all_moves: any[];
};

// Category icons for spending breakdown (Ionicons names)
const CATEGORY_ICONS: Record<string, string> = {
  'rent': 'home-outline',
  'housing': 'home-outline',
  'mortgage': 'home-outline',
  'food': 'cafe-outline',
  'groceries': 'cart-outline',
  'supermarket': 'cart-outline',
  'bills': 'flash-outline',
  'utilities': 'flash-outline',
  'energy': 'flash-outline',
  'transport': 'car-outline',
  'transportation': 'car-outline',
  'travel': 'airplane-outline',
  'shopping': 'bag-outline',
  'retail': 'bag-outline',
  'clothing': 'shirt-outline',
  'subscriptions': 'infinite-outline',
  'subscription': 'infinite-outline',
  'entertainment': 'musical-notes-outline',
  'dining': 'restaurant-outline',
  'restaurants': 'restaurant-outline',
  'insurance': 'shield-outline',
  'health': 'fitness-outline',
  'fitness': 'fitness-outline',
  'default': 'ellipse',
};

const getCategoryIcon = (category: string): string => {
  const lower = category.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return CATEGORY_ICONS.default;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [latest, setLatest] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showModify, setShowModify] = useState(false);
  const [committedMoves, setCommittedMoves] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fullName = user.user_metadata?.full_name || '';
      setUserName(fullName);

      const { data } = await supabase
        .from('analyses')
        .select('id, created_at, archetype, decision_score, monthly_income, monthly_spending, surplus, non_discretionary, discretionary, top_move, all_moves')
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

  const handleSignOut = async () => {
    setShowProfile(false);
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = () => {
    setShowProfile(false);
    confirm(
      'Delete account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
            await fetch(`${apiUrl}/api/delete-account`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
            });
          }
          await supabase.auth.signOut();
        } catch (err) {
          confirm('Something went wrong', 'Please try again or contact support.', () => {});
        }
      },
      'Delete',
      true,
    );
  };

  const formatCurrency = (n: number) => {
    if (Math.abs(n) >= 1000) return `\u00A3${(n / 1000).toFixed(1)}k`;
    return `\u00A3${Math.abs(Math.round(n)).toLocaleString()}`;
  };

  const formatExact = (n: number) => {
    return `\u00A3${Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const firstName = userName.split(' ')[0] || 'there';

  // Budget data
  const income = latest?.monthly_income || 0;
  const spending = latest?.monthly_spending || 0;
  const surplus = latest?.surplus || 0;

  // Category breakdowns
  const nonDiscItems: any[] = latest?.non_discretionary?.items || [];
  const discItems: any[] = latest?.discretionary?.items || [];
  const totalSpending = spending || ((latest?.non_discretionary?.total || 0) + (latest?.discretionary?.total || 0));

  // Top move
  const topMove = latest?.top_move;
  const allMoves: any[] = latest?.all_moves || [];

  return (
    <SafeAreaView style={s.container}>
      {/* Profile dropdown modal */}
      <Modal
        visible={showProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfile(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfile(false)}
        >
          <View style={s.profileMenu}>
            <Text style={s.profileMenuName}>{userName || 'Account'}</Text>
            <TouchableOpacity style={s.profileMenuItem} onPress={handleSignOut}>
              <Text style={s.profileMenuSignOut}>Sign out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.profileMenuItem} onPress={handleDeleteAccount}>
              <Text style={s.profileMenuDelete}>Delete account</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header: greeting + profile icon */}
        <View style={s.header}>
          <Text style={s.greetingText}>Hi, {firstName}</Text>
          <TouchableOpacity
            style={s.profileIcon}
            onPress={() => setShowProfile(true)}
            activeOpacity={0.7}
          >
            <Text style={s.profileInitial}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : !latest ? (
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
            {/* ===== Card 1: Income ===== */}
            <View style={s.incomeCard}>
              <Text style={s.cardLabel}>INCOME</Text>
              <Text style={s.incomeBig}>{formatCurrency(income)}</Text>

              <View style={s.incomeRow}>
                <View style={s.incomeMetric}>
                  <Text style={s.incomeMetricLabel}>Expense</Text>
                  <Text style={[s.incomeMetricValue, { color: theme.colors.coral }]}>
                    {formatExact(spending)}
                  </Text>
                </View>
                <View style={s.incomeMetricDivider} />
                <View style={s.incomeMetric}>
                  <Text style={s.incomeMetricLabel}>Surplus</Text>
                  <Text style={[s.incomeMetricValue, { color: surplus >= 0 ? theme.colors.mint : theme.colors.coral }]}>
                    {formatExact(surplus)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ===== Card 2: Insight / Recommendations ===== */}
            <View style={s.insightCard}>
              <Text style={s.cardLabel}>INSIGHT</Text>

              {topMove?.action ? (
                <>
                  <Text style={s.insightAction}>{topMove.action}</Text>

                  {/* Impact metrics */}
                  {(topMove.annualImpact > 0 || topMove.details) && (
                    <View style={s.insightMetrics}>
                      {topMove.annualImpact > 0 && (
                        <View style={s.insightMetric}>
                          <Text style={s.insightMetricValue}>{formatCurrency(topMove.annualImpact)}</Text>
                          <Text style={s.insightMetricLabel}>annual impact</Text>
                        </View>
                      )}
                      {topMove.monthlySaving > 0 && (
                        <View style={s.insightMetric}>
                          <Text style={s.insightMetricValue}>{formatCurrency(topMove.monthlySaving)}</Text>
                          <Text style={s.insightMetricLabel}>per month</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Second recommendation */}
                  {allMoves.length > 1 && allMoves[1]?.action && (
                    <View style={s.secondMove}>
                      <View style={s.secondMoveDot} />
                      <View style={s.secondMoveContent}>
                        <Text style={s.secondMoveAction}>{allMoves[1].action}</Text>
                        {allMoves[1].annualImpact > 0 && (
                          <Text style={s.secondMoveImpact}>
                            {formatCurrency(allMoves[1].annualImpact)}/yr impact
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Commit / Modify buttons */}
                  <View style={s.moveActions}>
                    <TouchableOpacity
                      style={[s.approveBtn, committedMoves['top'] && { backgroundColor: 'rgba(114,232,176,0.15)', borderWidth: 1, borderColor: theme.colors.mint }]}
                      onPress={() => {
                        setCommittedMoves(prev => ({ ...prev, ['top']: true }));
                        confirm("You're on it!", "We've noted this as a committed action. We'll track your progress in future analyses.", () => {});
                      }}
                      activeOpacity={0.8}
                      disabled={!!committedMoves['top']}
                    >
                      <Ionicons name={committedMoves['top'] ? 'checkmark-circle' : 'flash'} size={16} color={committedMoves['top'] ? theme.colors.mint : theme.colors.bg} style={{ marginRight: 6 }} />
                      <Text style={[s.approveBtnText, committedMoves['top'] && { color: theme.colors.mint }]}>{committedMoves['top'] ? 'Committed' : "I'll do this"}</Text>
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
                              <Text style={s.modifyItemAmount}>
                                {formatCurrency(item.amount)}/{item.frequency}
                              </Text>
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
                </>
              ) : (
                <Text style={s.noInsightText}>
                  Run an analysis to receive personalised recommendations.
                </Text>
              )}
            </View>

            {/* ===== Card 3: Where Your Money Goes ===== */}
            <View style={s.spendingCard}>
              <Text style={s.cardLabel}>WHERE YOUR MONEY GOES</Text>

              {/* Non-negotiable section */}
              {nonDiscItems.length > 0 && (
                <>
                  <Text style={s.spendingSectionTitle}>Non-negotiable</Text>
                  <View style={s.categoryList}>
                    {nonDiscItems.slice(0, 6).map((item: any, i: number) => {
                      const pct = totalSpending > 0 ? Math.round((item.monthly / totalSpending) * 100) : 0;
                      return (
                        <View key={i} style={s.categoryRow}>
                          <View style={s.categoryIconWrap}>
                            <Ionicons name={getCategoryIcon(item.category) as any} size={16} color={theme.colors.coral} />
                          </View>
                          <View style={s.categoryInfo}>
                            <View style={s.categoryNameRow}>
                              <Text style={s.categoryName}>{item.category}</Text>
                              <Text style={[s.categoryAmount, { color: theme.colors.coral }]}>
                                {formatCurrency(item.monthly)}/mo
                              </Text>
                            </View>
                            <View style={s.progressBarBg}>
                              <View style={[s.progressBarFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: theme.colors.coral }]} />
                            </View>
                          </View>
                          <Text style={s.categoryPct}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Lifestyle section */}
              {discItems.length > 0 && (
                <>
                  <Text style={[s.spendingSectionTitle, nonDiscItems.length > 0 && { marginTop: 20 }]}>Lifestyle</Text>
                  <View style={s.categoryList}>
                    {discItems.slice(0, 6).map((item: any, i: number) => {
                      const pct = totalSpending > 0 ? Math.round((item.monthly / totalSpending) * 100) : 0;
                      return (
                        <View key={i} style={s.categoryRow}>
                          <View style={[s.categoryIconWrap, { backgroundColor: theme.colors.skyDim }]}>
                            <Ionicons name={getCategoryIcon(item.category) as any} size={16} color={theme.colors.sky} />
                          </View>
                          <View style={s.categoryInfo}>
                            <View style={s.categoryNameRow}>
                              <Text style={s.categoryName}>{item.category}</Text>
                              <Text style={[s.categoryAmount, { color: theme.colors.sky }]}>
                                {formatCurrency(item.monthly)}/mo
                              </Text>
                            </View>
                            <View style={s.progressBarBg}>
                              <View style={[s.progressBarFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: theme.colors.sky }]} />
                            </View>
                          </View>
                          <Text style={s.categoryPct}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </View>

            {/* Run new analysis */}
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
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.accent,
  },

  // Profile menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 20,
  },
  profileMenu: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 200,
  },
  profileMenuName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  profileMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profileMenuSignOut: {
    fontSize: 14,
    color: theme.colors.text2,
  },
  profileMenuDelete: {
    fontSize: 14,
    color: theme.colors.coral,
  },

  // Loading / Empty
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.dim,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  startBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  startBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.bg,
  },

  // Shared card label
  cardLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: theme.colors.dim,
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // ===== Income Card =====
  incomeCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 14,
  },
  incomeBig: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'SpaceMono',
    marginBottom: 16,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incomeMetric: {
    flex: 1,
    alignItems: 'center',
  },
  incomeMetricDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  incomeMetricLabel: {
    fontSize: 12,
    color: theme.colors.dim,
    marginBottom: 4,
  },
  incomeMetricValue: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },

  // ===== Insight Card =====
  insightCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 14,
  },
  insightAction: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: 14,
  },
  insightMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  insightMetric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: theme.radius.sm,
  },
  insightMetricValue: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.accent,
    fontFamily: 'SpaceMono',
  },
  insightMetricLabel: {
    fontSize: 11,
    color: theme.colors.dim,
    marginTop: 2,
  },
  secondMove: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingTop: 14,
    marginBottom: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  secondMoveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentDim,
    marginTop: 6,
  },
  secondMoveContent: {
    flex: 1,
  },
  secondMoveAction: {
    fontSize: 14,
    color: theme.colors.text2,
    lineHeight: 21,
  },
  secondMoveImpact: {
    fontSize: 12,
    color: theme.colors.dim,
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  noInsightText: {
    fontSize: 14,
    color: theme.colors.dim,
    lineHeight: 21,
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
  modifySectionTitle: {
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

  // ===== Where Your Money Goes =====
  spendingCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 14,
  },
  spendingSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text2,
    marginBottom: 12,
  },
  categoryList: {
    gap: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.coralDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 16,
    color: theme.colors.coral,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 13,
    fontFamily: 'SpaceMono',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  categoryPct: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
    color: theme.colors.dim,
    width: 32,
    textAlign: 'right',
  },

  // New analysis button
  newBtn: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  newBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
