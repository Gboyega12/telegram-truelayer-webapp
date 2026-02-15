import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, radius } from '@/theme';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields.');
    if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters.');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return Alert.alert('Sign up failed', error.message);
    setSent(true);
  };

  const handleResend = async () => {
    await supabase.auth.resend({ type: 'signup', email });
    Alert.alert('Sent', 'Verification email resent.');
  };

  if (sent) {
    return (
      <View style={s.container}>
        <View style={s.inner}>
          <Text style={s.title}>Check your email</Text>
          <Text style={s.subtitle}>We've sent a verification link to {email}</Text>
          <TouchableOpacity style={s.btn} onPress={handleResend}>
            <Text style={s.btnText}>Resend email</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
            <Text style={s.linkText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        <Text style={s.title}>Create account</Text>
        <Text style={s.subtitle}>Join Bocy and take control of your money</Text>

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
          placeholder="Password (6+ characters)"
          placeholderTextColor={colors.dim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={s.btn} onPress={handleSignUp} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Creating account...' : 'Sign up'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={s.linkText}>Already have an account? <Text style={s.linkAccent}>Sign in</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  title: { fontFamily: fonts.mono, fontSize: 28, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.mono, fontSize: 13, color: colors.dim, textAlign: 'center', marginBottom: spacing.xl },
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
  linkText: { fontFamily: fonts.mono, fontSize: 13, color: colors.dim, textAlign: 'center', marginTop: spacing.lg },
  linkAccent: { color: colors.accent },
});
