import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import { confirm } from '../../lib/confirm';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email || !password) {
      confirm('Missing fields', 'Please enter your email and password.', () => {});
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      confirm('Sign in failed', error.message, () => {});
    }
    // AuthGate in _layout handles navigation on success
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <Text style={s.logoText}>BOCY</Text>
          <Text style={s.tagline}>Your personal financial advisor</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={theme.colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.bg} />
            ) : (
              <Text style={s.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Social auth */}
        <TouchableOpacity
          style={s.socialBtn}
          onPress={() => {
            supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: 'bocyapp://auth/callback' },
            });
          }}
          activeOpacity={0.8}
        >
          <Text style={s.socialBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.socialBtn}
          onPress={() => {
            supabase.auth.signInWithOAuth({
              provider: 'apple',
              options: { redirectTo: 'bocyapp://auth/callback' },
            });
          }}
          activeOpacity={0.8}
        >
          <Text style={s.socialBtnText}>Continue with Apple</Text>
        </TouchableOpacity>

        {/* Sign up link */}
        <TouchableOpacity
          style={s.linkWrap}
          onPress={() => router.push('/(auth)/sign-up' as any)}
        >
          <Text style={s.linkText}>
            Don't have an account? <Text style={s.linkAccent}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 28,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontFamily: 'SpaceMono',
    fontSize: 42,
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 14,
    color: theme.colors.dim,
    marginTop: 8,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 16,
    color: theme.colors.text,
    fontSize: 16,
  },
  btn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.bg,
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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
  socialBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  socialBtnText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  linkWrap: {
    alignItems: 'center',
    marginTop: 24,
  },
  linkText: {
    color: theme.colors.dim,
    fontSize: 14,
  },
  linkAccent: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
});
