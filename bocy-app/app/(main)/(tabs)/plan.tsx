import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../theme';
import { supabase } from '../../../lib/supabase';

const GOAL_LABELS: Record<string, string> = {
  in_debt: 'In debt',
  breaking_even: 'Breaking even',
  saving_slowly: 'Saving, but slowly',
  saving_well: 'Saving comfortably',
  clear_debt: 'Clear my debt',
  emergency_fund: 'Build an emergency fund',
  save_target: 'Save a specific amount',
  reduce_spending: 'Spend less, keep more',
  buy_home: 'Buy a home',
  invest: 'Start investing',
  go_freelance: 'Go freelance or start a business',
  financial_freedom: 'Financial freedom',
};

const getGoalLabel = (id: string) => {
  if (id?.startsWith('other:')) return id.slice(6);
  return GOAL_LABELS[id] || id;
};

export default function PlanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [expandedMove, setExpandedMove] = useState<number | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserName(user.user_metadata?.full_name || '');

      const [goalsRes, analysisRes] = await Promise.all([
        supabase.from('goals').select('*').eq('user_id', user.id).single(),
        supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      ]);

      if (goalsRes.data) setGoals(goalsRes.data);
      if (analysisRes.data && analysisRes.data.length > 0) setAnalysis(analysisRes.data[0]);
    } catch (err) {
      console.error('Failed to load plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n: number) => {
    if (Math.abs(n) >= 1000) return `\u00A3${(n / 1000).toFixed(1)}k`;
    return `\u00A3${Math.round(Math.abs(n))}`;
  };

  const isInDebt = goals?.current_situation === 'in_debt' || goals?.one_year_goal === 'clear_debt';
  const surplus = analysis?.surplus || 0;
  const allMoves: any[] = analysis?.all_moves || [];

  // Build email body for debt help
  const buildDebtEmailBody = (recipient: string) => {
    const income = analysis?.monthly_income || 0;
    const spending = analysis?.monthly_spending || 0;
    const name = userName || 'A Bocy user';

    return `Dear ${recipient},

I am writing to seek advice regarding my current financial situation.

Here is a summary of my finances:
- Monthly income: \u00A3${income.toFixed(2)}
- Monthly expenses: \u00A3${spending.toFixed(2)}
- Monthly surplus/deficit: \u00A3${surplus.toFixed(2)}
- Current situation: ${getGoalLabel(goals?.current_situation || 'in_debt')}
- My goal: ${getGoalLabel(goals?.one_year_goal || '')}

I would appreciate any guidance on how to manage my situation and work towards becoming debt-free.

Thank you for your time.

Kind regards,
${name}`;
  };

  const handleEmailHelp = (type: 'stepchange' | 'citizens_advice' | 'credit_card') => {
    let email = '';
    let subject = '';
    let recipient = '';

    switch (type) {
      case 'stepchange':
        email = '';
        subject = 'Request for Debt Advice';
        recipient = 'StepChange';
        break;
      case 'citizens_advice':
        email = '';
        subject = 'Request for Financial Guidance';
        recipient = 'Citizens Advice';
        break;
      case 'credit_card':
        email = '';
        subject = 'Hardship Period Application';
        recipient = 'the team';
        break;
    }

    const body = encodeURIComponent(buildDebtEmailBody(recipient));
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Your Plan</Text>

        {/* Action plan for each move */}
        {allMoves.length > 0 ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Action Plan</Text>

            {allMoves.slice(0, 4).map((move: any, i: number) => {
              const isExpanded = expandedMove === i;
              return (
                <View key={i} style={s.planItem}>
                  <TouchableOpacity
                    style={s.planItemHeader}
                    onPress={() => setExpandedMove(isExpanded ? null : i)}
                    activeOpacity={0.7}
                  >
                    <View style={s.planBadge}>
                      <Text style={s.planBadgeText}>{i + 1}</Text>
                    </View>
                    <View style={s.planItemInfo}>
                      <Text style={s.planItemAction}>{move.action}</Text>
                      {move.annualImpact > 0 && (
                        <Text style={s.planItemImpact}>{formatCurrency(move.annualImpact)}/yr impact</Text>
                      )}
                    </View>
                    <Text style={s.expandArrow}>{isExpanded ? '\u25BE' : '\u25B8'}</Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={s.planDetail}>
                      {move.details?.strategy && (
                        <Text style={s.planStrategy}>{move.details.strategy}</Text>
                      )}
                      {move.details?.reasoning && (
                        <Text style={s.planReasoning}>{move.details.reasoning}</Text>
                      )}

                      {move.details?.steps?.length > 0 && (
                        <View style={s.planSteps}>
                          {move.details.steps.map((step: string, j: number) => (
                            <View key={j} style={s.planStepRow}>
                              <Text style={s.planStepNum}>{j + 1}</Text>
                              <Text style={s.planStepText}>{step}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {move.details?.effect && (
                        <View style={s.planEffectBox}>
                          <Text style={s.planEffectLabel}>Expected outcome</Text>
                          <Text style={s.planEffectText}>{move.details.effect}</Text>
                        </View>
                      )}

                      {/* Automate / Cancel */}
                      <View style={s.planActions}>
                        <TouchableOpacity style={s.automateBtn} activeOpacity={0.8}>
                          <Text style={s.automateBtnText}>Automate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.cancelBtn}
                          onPress={() => setExpandedMove(null)}
                          activeOpacity={0.8}
                        >
                          <Text style={s.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : !analysis ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyText}>Run your first analysis to see a personalised plan.</Text>
            <TouchableOpacity
              style={s.startBtn}
              onPress={() => router.push('/(main)/connect' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.startBtnText}>Start analysis</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Debt help section */}
        {isInDebt && analysis && (
          <View style={s.debtCard}>
            <Text style={s.debtTitle}>Need help with debt?</Text>
            <Text style={s.debtSubtext}>
              {surplus > 0
                ? `You have \u00A3${Math.round(surplus)} surplus each month that could go towards paying down debt.`
                : 'Your expenses currently exceed your income. Free, confidential help is available.'
              }
            </Text>

            {surplus <= 0 && (
              <>
                <TouchableOpacity
                  style={s.debtHelpBtn}
                  onPress={() => handleEmailHelp('stepchange')}
                  activeOpacity={0.8}
                >
                  <Text style={s.debtHelpBtnText}>Contact StepChange</Text>
                  <Text style={s.debtHelpBtnSub}>Free debt advice charity</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.debtHelpBtn}
                  onPress={() => handleEmailHelp('citizens_advice')}
                  activeOpacity={0.8}
                >
                  <Text style={s.debtHelpBtnText}>Contact Citizens Advice</Text>
                  <Text style={s.debtHelpBtnSub}>Free, independent guidance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.debtHelpBtn}
                  onPress={() => handleEmailHelp('credit_card')}
                  activeOpacity={0.8}
                >
                  <Text style={s.debtHelpBtnText}>Apply for hardship period</Text>
                  <Text style={s.debtHelpBtnSub}>Request breathing space from your lender</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  pageTitle: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginBottom: 24 },

  card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: 20, marginBottom: 16 },
  cardTitle: { fontFamily: 'SpaceMono', fontSize: 11, color: theme.colors.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 },

  // Plan items
  planItem: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  planItemHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  planBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.accentDim, justifyContent: 'center', alignItems: 'center' },
  planBadgeText: { fontFamily: 'SpaceMono', fontSize: 12, fontWeight: '700', color: theme.colors.accent },
  planItemInfo: { flex: 1 },
  planItemAction: { fontSize: 15, color: theme.colors.text, fontWeight: '500', lineHeight: 22 },
  planItemImpact: { fontSize: 12, color: theme.colors.mint, fontFamily: 'SpaceMono', marginTop: 2 },
  expandArrow: { fontSize: 14, color: theme.colors.muted },

  // Plan detail
  planDetail: { paddingLeft: 40, paddingBottom: 16 },
  planStrategy: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  planReasoning: { fontSize: 14, color: theme.colors.text2, lineHeight: 21, marginBottom: 12 },
  planSteps: { marginBottom: 12 },
  planStepRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  planStepNum: { fontSize: 13, color: theme.colors.accent, fontFamily: 'SpaceMono', width: 20, textAlign: 'center' },
  planStepText: { flex: 1, fontSize: 14, color: theme.colors.text2, lineHeight: 20 },
  planEffectBox: { backgroundColor: 'rgba(114,232,176,0.06)', borderRadius: theme.radius.sm, padding: 14, borderLeftWidth: 3, borderLeftColor: theme.colors.mint, marginBottom: 14 },
  planEffectLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.mint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  planEffectText: { fontSize: 14, color: theme.colors.text2, lineHeight: 20 },

  planActions: { flexDirection: 'row', gap: 12 },
  automateBtn: { flex: 1, backgroundColor: theme.colors.accent, borderRadius: theme.radius.md, padding: 12, alignItems: 'center' },
  automateBtnText: { fontFamily: 'SpaceMono', fontSize: 12, fontWeight: '700', color: theme.colors.bg, letterSpacing: 1 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: 12, alignItems: 'center' },
  cancelBtnText: { fontFamily: 'SpaceMono', fontSize: 12, fontWeight: '600', color: theme.colors.dim, letterSpacing: 1 },

  // Empty
  emptyWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: theme.colors.dim, textAlign: 'center', marginBottom: 20 },
  startBtn: { backgroundColor: theme.colors.accent, borderRadius: theme.radius.md, paddingHorizontal: 28, paddingVertical: 14 },
  startBtnText: { fontFamily: 'SpaceMono', fontSize: 14, fontWeight: '700', color: theme.colors.bg },

  // Debt help
  debtCard: { backgroundColor: 'rgba(232,114,114,0.06)', borderWidth: 1, borderColor: theme.colors.coralDim, borderRadius: theme.radius.lg, padding: 20, marginBottom: 16 },
  debtTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  debtSubtext: { fontSize: 14, color: theme.colors.text2, lineHeight: 21, marginBottom: 16 },
  debtHelpBtn: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: 16, marginBottom: 10 },
  debtHelpBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  debtHelpBtnSub: { fontSize: 12, color: theme.colors.dim, marginTop: 2 },
});
