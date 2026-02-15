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
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';

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

export default function DashboardScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [latest, setLatest] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

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

  const formatCurrency = (n: number) => {
    if (n >= 1000) return `£${(n / 1000).toFixed(1)}k`;
    return `£${Math.round(n)}`;
  };

  const firstName = userName.split(' ')[0] || 'there';

  // Pick the top 2 most actionable moves
  const getTopMoves = (): { action: string; impact: number; effort: string }[] => {
    if (!latest) return [];
    const moves: any[] = latest.all_moves || [];
    if (moves.length === 0 && latest.top_move?.action) {
      return [{ action: latest.top_move.action, impact: latest.top_move.annualImpact || 0, effort: latest.top_move.effort || 'low' }];
    }
    return moves.slice(0, 2).map(m => ({
      action: m.action,
      impact: m.annualImpact || 0,
      effort: m.effort || 'low',
    }));
  };

  const topMoves = getTopMoves();

  // Budget breakdown
  const nonDisc = latest?.non_discretionary?.total || 0;
  const disc = latest?.discretionary?.total || 0;
  const surplus = latest?.surplus || 0;
  const totalSpending = nonDisc + disc;
  const totalOut = totalSpending + Math.max(surplus, 0);

  const nonDiscPct = totalOut > 0 ? Math.round((nonDisc / totalOut) * 100) : 0;
  const discPct = totalOut > 0 ? Math.round((disc / totalOut) * 100) : 0;
  const surplusPct = totalOut > 0 ? Math.round((Math.max(surplus, 0) / totalOut) * 100) : 0;

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
              <Text style={s.profileMenuItemText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header: greeting + profile icon */}
        <View style={s.header}>
          <View style={s.greeting}>
            <Text style={s.greetingText}>Hi, {firstName}</Text>
          </View>
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
            {/* Card 1: Monthly Income */}
            <View style={s.card}>
              <Text style={s.cardLabel}>Monthly Income</Text>
              <Text style={s.cardBigNumber}>{formatCurrency(latest.monthly_income)}</Text>
            </View>

            {/* Card 2: Your Budget Reality */}
            <View style={s.card}>
              <Text style={s.cardLabel}>Your Budget Reality</Text>

              {/* Visual bar */}
              <View style={s.budgetBar}>
                {nonDiscPct > 0 && (
                  <View style={[s.budgetBarSeg, { flex: nonDiscPct, backgroundColor: theme.colors.coral }]} />
                )}
                {discPct > 0 && (
                  <View style={[s.budgetBarSeg, { flex: discPct, backgroundColor: theme.colors.sky }]} />
                )}
                {surplusPct > 0 && (
                  <View style={[s.budgetBarSeg, { flex: surplusPct, backgroundColor: theme.colors.mint }]} />
                )}
              </View>

              <View style={s.budgetLegend}>
                <View style={s.budgetLegendItem}>
                  <View style={[s.legendDot, { backgroundColor: theme.colors.coral }]} />
                  <Text style={s.legendText}>Essentials</Text>
                  <Text style={[s.legendValue, { color: theme.colors.coral }]}>{formatCurrency(nonDisc)}</Text>
                </View>
                <View style={s.budgetLegendItem}>
                  <View style={[s.legendDot, { backgroundColor: theme.colors.sky }]} />
                  <Text style={s.legendText}>Lifestyle</Text>
                  <Text style={[s.legendValue, { color: theme.colors.sky }]}>{formatCurrency(disc)}</Text>
                </View>
                <View style={s.budgetLegendItem}>
                  <View style={[s.legendDot, { backgroundColor: surplus >= 0 ? theme.colors.mint : theme.colors.coral }]} />
                  <Text style={s.legendText}>Surplus</Text>
                  <Text style={[s.legendValue, { color: surplus >= 0 ? theme.colors.mint : theme.colors.coral }]}>
                    {surplus >= 0 ? '+' : ''}{formatCurrency(surplus)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Card 3: Recommendations */}
            <View style={s.card}>
              <Text style={s.cardLabel}>Recommendations</Text>

              {topMoves.length > 0 ? (
                <View style={s.movesList}>
                  {topMoves.map((move, i) => (
                    <View key={i} style={s.moveRow}>
                      <View style={s.moveNumber}>
                        <Text style={s.moveNumberText}>{i + 1}</Text>
                      </View>
                      <View style={s.moveContent}>
                        <Text style={s.moveAction}>{move.action}</Text>
                        {move.impact > 0 && (
                          <Text style={s.moveImpact}>
                            Potential impact: {formatCurrency(move.impact)}/year
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={s.noMovesText}>
                  Run an analysis to receive personalised recommendations.
                </Text>
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
    marginBottom: 28,
  },
  greeting: {},
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
    minWidth: 180,
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
  profileMenuItemText: {
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

  // Cards
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 14,
  },
  cardLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: theme.colors.dim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  cardBigNumber: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'SpaceMono',
  },

  // Budget reality
  budgetBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
    gap: 2,
  },
  budgetBarSeg: {
    borderRadius: 4,
  },
  budgetLegend: {
    gap: 10,
  },
  budgetLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text2,
  },
  legendValue: {
    fontSize: 14,
    fontFamily: 'SpaceMono',
    fontWeight: '600',
  },

  // Recommendations
  movesList: {
    gap: 14,
  },
  moveRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  moveNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  moveNumberText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  moveContent: {
    flex: 1,
  },
  moveAction: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  moveImpact: {
    fontSize: 13,
    color: theme.colors.mint,
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  noMovesText: {
    fontSize: 14,
    color: theme.colors.dim,
    lineHeight: 21,
  },

  // New analysis
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
