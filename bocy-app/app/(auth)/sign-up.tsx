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
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Please verify your email to sign in.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>
        <View style={s.header}>
          <Text style={s.title}>Create account</Text>
          <Text style={s.subtitle}>Start understanding your money in minutes</Text>
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
});
