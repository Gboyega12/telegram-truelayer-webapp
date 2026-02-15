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
  top_move: any;
};

export default function HistoryScreen() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('analyses')
        .select('id, created_at, archetype, decision_score, monthly_income, monthly_spending, surplus, top_move')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setAnalyses(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (n: number) => {
    if (n >= 1000) return `£${(n / 1000).toFixed(1)}k`;
    return `£${Math.round(n)}`;
  };

  const archetypeNames: Record<string, string> = {
    debt_juggler: 'Debt Juggler',
    quiet_builder: 'Quiet Builder',
    edge_walker: 'Edge Walker',
    subscription_collector: 'Subscription Collector',
    impulse_surfer: 'Impulse Surfer',
    convenience_seeker: 'Convenience Seeker',
    comfort_spender: 'Comfort Spender',
    lifestyle_investor: 'Lifestyle Investor',
    side_hustler: 'Side Hustler',
    balanced_realist: 'Balanced Realist',
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Text style={s.logo}>BOCY</Text>
          <Text style={s.title}>Analysis History</Text>
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : analyses.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyText}>No analyses yet.</Text>
            <Text style={s.emptySubtext}>Connect your bank or upload a CSV to get started.</Text>
            <TouchableOpacity
              style={s.startBtn}
              onPress={() => router.replace('/(main)/connect' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.startBtnText}>Get started</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.list}>
            {analyses.map((a) => (
              <View key={a.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardDate}>{formatDate(a.created_at)}</Text>
                  <View style={s.scoreBadge}>
                    <Text style={s.scoreText}>{a.decision_score}</Text>
                  </View>
                </View>

                <Text style={s.archetype}>
                  {archetypeNames[a.archetype] || a.archetype}
                </Text>

                <View style={s.cardMetrics}>
                  <View style={s.metric}>
                    <Text style={s.metricLabel}>Income</Text>
                    <Text style={[s.metricValue, { color: theme.colors.mint }]}>
                      {formatCurrency(a.monthly_income)}
                    </Text>
                  </View>
                  <View style={s.metric}>
                    <Text style={s.metricLabel}>Spending</Text>
                    <Text style={[s.metricValue, { color: theme.colors.coral }]}>
                      {formatCurrency(a.monthly_spending)}
                    </Text>
                  </View>
                  <View style={s.metric}>
                    <Text style={s.metricLabel}>Surplus</Text>
                    <Text style={[s.metricValue, { color: a.surplus >= 0 ? theme.colors.mint : theme.colors.coral }]}>
                      {a.surplus >= 0 ? '+' : ''}{formatCurrency(a.surplus)}
                    </Text>
                  </View>
                </View>

                {a.top_move?.action && (
                  <View style={s.topMoveWrap}>
                    <Text style={s.topMoveLabel}>#1 Move</Text>
                    <Text style={s.topMoveAction} numberOfLines={2}>{a.top_move.action}</Text>
                    {a.top_move.annualImpact > 0 && (
                      <Text style={s.topMoveImpact}>
                        {formatCurrency(a.top_move.annualImpact)}/yr impact
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={s.newBtn}
          onPress={() => router.replace('/(main)/connect' as any)}
          activeOpacity={0.8}
        >
          <Text style={s.newBtnText}>New analysis</Text>
        </TouchableOpacity>
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
  logo: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    color: theme.colors.accent,
    letterSpacing: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.dim,
    textAlign: 'center',
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
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 13,
    color: theme.colors.dim,
    fontFamily: 'SpaceMono',
  },
  scoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
    fontFamily: 'SpaceMono',
  },
  archetype: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  cardMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: theme.radius.sm,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.colors.dim,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  topMoveWrap: {
    backgroundColor: 'rgba(232,200,114,0.06)',
    borderRadius: theme.radius.sm,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  topMoveLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  topMoveAction: {
    fontSize: 14,
    color: theme.colors.text2,
    lineHeight: 20,
  },
  topMoveImpact: {
    fontSize: 12,
    color: theme.colors.dim,
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  newBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  newBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    color: theme.colors.dim,
    letterSpacing: 1,
  },
});
