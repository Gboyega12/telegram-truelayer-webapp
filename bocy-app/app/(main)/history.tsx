import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, radius } from '@/theme';

export default function History() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('analyses')
        .select('id, created_at, archetype, decision_score, monthly_income, monthly_spending, surplus')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setAnalyses(data || []);
    })();
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={s.container}>
      <Text style={s.title}>Analysis history</Text>
      {analyses.length === 0 ? (
        <Text style={s.empty}>No past analyses found.</Text>
      ) : (
        <FlatList
          data={analyses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.date}>{formatDate(item.created_at)}</Text>
              <View style={s.row}>
                <Text style={s.label}>Income</Text>
                <Text style={[s.value, { color: colors.mint }]}>{'\u00A3'}{Math.round(item.monthly_income)}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Spending</Text>
                <Text style={[s.value, { color: colors.coral }]}>{'\u00A3'}{Math.round(item.monthly_spending)}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Surplus</Text>
                <Text style={[s.value, { color: item.surplus >= 0 ? colors.mint : colors.coral }]}>{'\u00A3'}{Math.round(item.surplus)}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Score</Text>
                <Text style={s.value}>{item.decision_score}/100</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontFamily: fonts.mono, fontSize: 22, color: colors.text, paddingHorizontal: spacing.md, paddingTop: 60, marginBottom: spacing.md },
  empty: { fontFamily: fonts.mono, fontSize: 14, color: colors.dim, textAlign: 'center', marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  date: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  label: { fontFamily: fonts.mono, fontSize: 13, color: colors.text2 },
  value: { fontFamily: fonts.mono, fontSize: 13, color: colors.text, fontWeight: '600' },
});
