import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { confirm } from '../../lib/confirm';

const VALUE_POINTS = [
  {
    icon: 'lock-closed-outline' as const,
    title: 'Connect your bank',
    desc: 'Securely link your account or upload a statement. Your data stays private.',
  },
  {
    icon: 'analytics-outline' as const,
    title: 'We analyse your spending',
    desc: 'Our engine reviews your transactions, spots patterns, and understands your habits.',
  },
  {
    icon: 'flash-outline' as const,
    title: 'Get personalised recommendations',
    desc: 'Receive clear, actionable steps tailored to your goals — not generic advice.',
  },
];

export default function WelcomeScreen() {
  const [step, setStep] = useState<'intro' | 'name'>('intro');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSaveName = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) {
      confirm('What should we call you?', 'Please enter your first name.', () => {});
      return;
    }

    setSaving(true);
    const fullName = trimmedLast
      ? `${trimmedFirst} ${trimmedLast}`
      : trimmedFirst;

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    setSaving(false);

    if (error) {
      confirm('Something went wrong', error.message, () => {});
    } else {
      router.replace('/(main)/connect' as any);
    }
  };

  if (step === 'intro') {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.introHeader}>
            <Text style={s.welcomeLabel}>WELCOME TO</Text>
            <Text style={s.appName}>BOCY</Text>
            <Text style={s.introSubtitle}>
              Your personal financial advisor — powered by data, designed around your life.
            </Text>
          </View>

          <View style={s.valuePoints}>
            {VALUE_POINTS.map((point, i) => (
              <View key={i} style={s.valuePoint}>
                <View style={s.valueIconWrap}>
                  <Ionicons name={point.icon} size={18} color={theme.colors.accent} />
                </View>
                <View style={s.valueContent}>
                  <Text style={s.valueTitle}>{point.title}</Text>
                  <Text style={s.valueDesc}>{point.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={s.promiseBox}>
            <Text style={s.promiseText}>
              We don't sell your data. We don't show ads. We simply help you make better financial decisions.
            </Text>
          </View>

          <TouchableOpacity
            style={s.continueBtn}
            onPress={() => setStep('name')}
            activeOpacity={0.8}
          >
            <Text style={s.continueBtnText}>Get Started</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.nameHeader}>
            <Text style={s.nameTitle}>What's your name?</Text>
            <Text style={s.nameSubtitle}>
              So we can personalise your experience.
            </Text>
          </View>

          <View style={s.nameForm}>
            <TextInput
              style={s.input}
              placeholder="First name"
              placeholderTextColor={theme.colors.muted}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              textContentType="givenName"
              autoFocus
            />
            <TextInput
              style={s.input}
              placeholder="Last name (optional)"
              placeholderTextColor={theme.colors.muted}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              textContentType="familyName"
            />
          </View>

          {firstName.trim() ? (
            <TouchableOpacity
              style={[s.continueBtn, saving && s.continueBtnDisabled]}
              onPress={handleSaveName}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.bg} />
              ) : (
                <Text style={s.continueBtnText}>Continue</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Intro screen
  introHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: theme.colors.dim,
    letterSpacing: 3,
    marginBottom: 8,
  },
  appName: {
    fontFamily: 'SpaceMono',
    fontSize: 38,
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 8,
    marginBottom: 16,
  },
  introSubtitle: {
    fontSize: 16,
    color: theme.colors.text2,
    textAlign: 'center',
    lineHeight: 24,
  },
  valuePoints: {
    gap: 20,
    marginBottom: 28,
  },
  valuePoint: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  valueIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueIcon: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  valueDesc: {
    fontSize: 14,
    color: theme.colors.dim,
    lineHeight: 21,
  },
  promiseBox: {
    backgroundColor: 'rgba(114,232,176,0.06)',
    borderRadius: theme.radius.md,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.mint,
    marginBottom: 32,
  },
  promiseText: {
    fontSize: 14,
    color: theme.colors.text2,
    lineHeight: 21,
  },

  // Name screen
  nameHeader: {
    marginBottom: 32,
  },
  nameTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  nameSubtitle: {
    fontSize: 15,
    color: theme.colors.dim,
    lineHeight: 22,
  },
  nameForm: {
    gap: 12,
    marginBottom: 28,
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

  // Shared
  continueBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: 18,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.bg,
    letterSpacing: 1,
  },
});
