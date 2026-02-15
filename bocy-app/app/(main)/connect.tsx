import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as DocumentPicker from 'expo-document-picker';
import { getTrueLayerAuthUrl, extractCSVFromCallbackHTML } from '@/lib/truelayer';
import { colors, fonts, spacing, radius } from '@/theme';

export default function Connect() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleOpenBanking = async () => {
    setLoading(true);
    try {
      const url = getTrueLayerAuthUrl();
      const result = await WebBrowser.openAuthSessionAsync(url, 'bocy://callback');
      if (result.type === 'success' && result.url) {
        const csv = extractCSVFromCallbackHTML(result.url);
        if (csv) {
          router.push({ pathname: '/(main)/goals', params: { csvData: csv } });
          return;
        }
      }
      Alert.alert('Connection cancelled', 'You can try again or upload a CSV file.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (result.canceled) return;
      const file = result.assets[0];
      const response = await fetch(file.uri);
      const csv = await response.text();
      if (csv.trim()) {
        router.push({ pathname: '/(main)/goals', params: { csvData: csv } });
      } else {
        Alert.alert('Error', 'CSV file appears to be empty.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.inner}>
        <Text style={s.title}>Connect your bank</Text>
        <Text style={s.subtitle}>We need your transactions to build your analysis.</Text>

        <TouchableOpacity style={s.primaryBtn} onPress={handleOpenBanking} disabled={loading}>
          <Text style={s.primaryText}>{loading ? 'Connecting...' : 'Connect via Open Banking'}</Text>
        </TouchableOpacity>

        <View style={s.trust}>
          <Text style={s.trustItem}>FCA regulated</Text>
          <Text style={s.trustItem}>Read-only access</Text>
          <Text style={s.trustItem}>Data stays on your device</Text>
        </View>

        <View style={s.divider}>
          <View style={s.line} />
          <Text style={s.orText}>or</Text>
          <View style={s.line} />
        </View>

        <TouchableOpacity style={s.secondaryBtn} onPress={handleCSVUpload}>
          <Text style={s.secondaryText}>Upload a CSV file</Text>
        </TouchableOpacity>
        <Text style={s.hint}>Export transactions from your banking app as CSV.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  title: { fontFamily: fonts.mono, fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.mono, fontSize: 13, color: colors.dim, textAlign: 'center', marginBottom: spacing.xl },
  primaryBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryText: { fontFamily: fonts.mono, fontSize: 15, color: colors.bg, fontWeight: '700' },
  trust: { marginTop: spacing.md, marginBottom: spacing.lg },
  trustItem: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, textAlign: 'center', marginBottom: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim, marginHorizontal: spacing.sm },
  secondaryBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  secondaryText: { fontFamily: fonts.mono, fontSize: 14, color: colors.text },
  hint: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
});
