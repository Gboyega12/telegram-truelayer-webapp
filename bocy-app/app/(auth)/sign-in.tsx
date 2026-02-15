import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, radius } from '@/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields.');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error.message);
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: Platform.OS === 'web' ? window.location.origin : undefined },
    });
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        <Text style={s.title}>Bocy</Text>
        <Text style={s.subtitle}>Your personal money advisor</Text>

        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={colors.dim}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={colors.dim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={s.btn} onPress={handleSignIn} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={s.line} />
          <Text style={s.orText}>or</Text>
          <View style={s.line} />
        </View>

        <TouchableOpacity style={s.oauthBtn} onPress={() => handleOAuth('google')}>
          <Text style={s.oauthText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.oauthBtn} onPress={() => handleOAuth('apple')}>
          <Text style={s.oauthText}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
          <Text style={s.linkText}>Don't have an account? <Text style={s.linkAccent}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  title: { fontFamily: fonts.mono, fontSize: 36, color: colors.accent, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.mono, fontSize: 14, color: colors.dim, textAlign: 'center', marginBottom: spacing.xl },
  input: {
    fontFamily: fonts.mono, fontSize: 14, color: colors.text,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  btn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm,
  },
  btnText: { fontFamily: fonts.mono, fontSize: 15, color: colors.bg, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim, marginHorizontal: spacing.sm },
  oauthBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm,
  },
  oauthText: { fontFamily: fonts.mono, fontSize: 14, color: colors.text },
  linkText: { fontFamily: fonts.mono, fontSize: 13, color: colors.dim, textAlign: 'center', marginTop: spacing.lg },
  linkAccent: { color: colors.accent },
});
