import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      setVerificationSent(true);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    setResending(false);
    if (error) {
      Alert.alert('Could not resend', error.message);
    } else {
      Alert.alert('Email sent', 'We\'ve sent another verification link to your inbox.');
    }
  };

  if (verificationSent) {
    return (
      <View style={s.container}>
        <View style={s.inner}>
          <View style={s.verifyIconWrap}>
            <Text style={s.verifyIcon}>&#9993;</Text>
          </View>

          <Text style={s.verifyTitle}>Check your inbox</Text>
          <Text style={s.verifySubtitle}>
            We've sent a verification link to
          </Text>
          <Text style={s.verifyEmail}>{email}</Text>
          <Text style={s.verifyHint}>
            Open the link in the email to verify your account, then come back here to sign in.
          </Text>

          <TouchableOpacity
            style={s.btn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={s.btnText}>Back to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.resendWrap}
            onPress={handleResend}
            disabled={resending}
            activeOpacity={0.7}
          >
            {resending ? (
              <ActivityIndicator color={theme.colors.accent} size="small" />
            ) : (
              <Text style={s.resendText}>
                Didn't receive it? <Text style={s.resendAccent}>Resend email</Text>
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>
        <View style={s.header}>
          <Text style={s.title}>Create your account</Text>
          <Text style={s.subtitle}>It only takes a moment to get started.</Text>
        </View>

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
            textContentType="newPassword"
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.bg} />
            ) : (
              <Text style={s.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={s.linkWrap}
          onPress={() => router.back()}
        >
          <Text style={s.linkText}>
            Already have an account? <Text style={s.linkAccent}>Sign in</Text>
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
  header: {
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.dim,
    lineHeight: 22,
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
  linkWrap: {
    alignItems: 'center',
    marginTop: 28,
  },
  linkText: {
    color: theme.colors.dim,
    fontSize: 14,
  },
  linkAccent: {
    color: theme.colors.accent,
    fontWeight: '600',
  },

  // Verification screen
  verifyIconWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyIcon: {
    fontSize: 48,
    color: theme.colors.accent,
  },
  verifyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  verifySubtitle: {
    fontSize: 15,
    color: theme.colors.dim,
    textAlign: 'center',
    lineHeight: 22,
  },
  verifyEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  verifyHint: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  resendWrap: {
    alignItems: 'center',
    marginTop: 20,
    minHeight: 24,
  },
  resendText: {
    color: theme.colors.dim,
    fontSize: 14,
  },
  resendAccent: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
});
