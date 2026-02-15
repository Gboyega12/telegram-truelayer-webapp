import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { theme } from '../../theme';
import { getTrueLayerAuthUrl } from '../../lib/truelayer';
import { confirm } from '../../lib/confirm';

export default function ConnectScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleBankConnect = async () => {
    setLoading(true);
    try {
      const authUrl = getTrueLayerAuthUrl();
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'bocyapp://auth/callback'
      );

      if (result.type === 'success' && result.url) {
        // Extract CSV data from the callback URL
        const url = new URL(result.url);
        const csvData = url.searchParams.get('csv');
        if (csvData) {
          router.push({
            pathname: '/(main)/goals' as any,
            params: { csvData: decodeURIComponent(csvData), source: 'bank' },
          });
        } else {
          confirm('Connection issue', 'We couldn\'t retrieve your transaction data. Please try again.', () => {});
        }
      }
    } catch (error) {
      confirm('Something went wrong', 'The bank connection didn\'t go through. Please try again.', () => {});
    }
    setLoading(false);
  };

  const handleCSVUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        const response = await fetch(file.uri);
        const csvData = await response.text();

        if (csvData && csvData.length > 50) {
          router.push({
            pathname: '/(main)/goals' as any,
            params: { csvData, source: 'csv' },
          });
        } else {
          confirm('Hmm, that doesn\'t look right', 'The file appears to be empty or isn\'t a valid CSV. Please try another.', () => {});
        }
      }
    } catch (error) {
      confirm('Something went wrong', 'We couldn\'t read that file. Please make sure it\'s a CSV export from your bank.', () => {});
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Connect your bank</Text>
          <Text style={s.subtitle}>
            We'll review your transactions to find personalised ways to improve your finances. Your data stays private and secure.
          </Text>
        </View>

        {/* Connect options */}
        <View style={s.options}>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={handleBankConnect}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={s.btnIcon}>
              <Text style={s.btnIconText}>&#9741;</Text>
            </View>
            <View style={s.btnContent}>
              <Text style={s.primaryBtnTitle}>Connect via Open Banking</Text>
              <Text style={s.primaryBtnSub}>Secure, read-only access via TrueLayer</Text>
            </View>
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={handleCSVUpload}
            activeOpacity={0.8}
          >
            <Text style={s.secondaryBtnTitle}>Upload a bank statement</Text>
            <Text style={s.secondaryBtnSub}>CSV file from your banking app</Text>
          </TouchableOpacity>
        </View>

        {/* Trust indicators */}
        <View style={s.trust}>
          <View style={s.trustItem}>
            <Text style={s.trustIcon}>&#9399;</Text>
            <Text style={s.trustText}>FCA regulated</Text>
          </View>
          <View style={s.trustItem}>
            <Text style={s.trustIcon}>&#9399;</Text>
            <Text style={s.trustText}>Read-only access</Text>
          </View>
          <View style={s.trustItem}>
            <Text style={s.trustIcon}>&#9399;</Text>
            <Text style={s.trustText}>Data stays on device</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.dim,
    lineHeight: 23,
  },
  options: {
    gap: 0,
  },
  primaryBtn: {
    backgroundColor: 'rgba(232,200,114,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.accentDim,
    borderRadius: theme.radius.lg,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  btnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIconText: {
    fontSize: 20,
    color: theme.colors.accent,
  },
  btnContent: {
    flex: 1,
  },
  primaryBtnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  primaryBtnSub: {
    fontSize: 13,
    color: theme.colors.dim,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.muted,
    fontSize: 12,
    paddingHorizontal: 12,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 20,
    alignItems: 'center',
  },
  secondaryBtnTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  secondaryBtnSub: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  trust: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 36,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustIcon: {
    fontSize: 10,
    color: theme.colors.mint,
  },
  trustText: {
    fontSize: 11,
    color: theme.colors.muted,
  },
});
