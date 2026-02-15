import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, radius } from '@/theme';

export default function Welcome() {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSaveName = async () => {
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!name) return Alert.alert('Error', 'Please enter your name.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setLoading(false);
    if (error) return Alert.alert('Error', error.message);
    router.replace('/(main)/connect');
  };

  if (step === 0) {
    return (
      <View style={s.container}>
        <View style={s.inner}>
          <Text style={s.emoji}>{'{'} B {'}'}</Text>
          <Text style={s.title}>Welcome to Bocy</Text>
          <Text style={s.body}>We analyse your bank transactions to give you personalised, actionable money moves.</Text>
          <View style={s.bullets}>
            <Text style={s.bullet}>See where your money really goes</Text>
            <Text style={s.bullet}>Get moves tailored to your goals</Text>
            <Text style={s.bullet}>No judgement — just clarity</Text>
          </View>
          <TouchableOpacity style={s.btn} onPress={() => setStep(1)}>
            <Text style={s.btnText}>Get started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.inner}>
        <Text style={s.title}>What's your name?</Text>
        <Text style={s.sub}>So we know what to call you.</Text>
        <TextInput
          style={s.input}
          placeholder="First name"
          placeholderTextColor={colors.dim}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        <TextInput
          style={s.input}
          placeholder="Last name"
          placeholderTextColor={colors.dim}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        <TouchableOpacity style={s.btn} onPress={handleSaveName} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  emoji: { fontFamily: fonts.mono, fontSize: 40, color: colors.accent, textAlign: 'center', marginBottom: spacing.md },
  title: { fontFamily: fonts.mono, fontSize: 26, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  sub: { fontFamily: fonts.mono, fontSize: 13, color: colors.dim, textAlign: 'center', marginBottom: spacing.lg },
  body: { fontFamily: fonts.mono, fontSize: 13, color: colors.text2, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  bullets: { marginBottom: spacing.xl },
  bullet: { fontFamily: fonts.mono, fontSize: 13, color: colors.text2, marginBottom: spacing.sm, textAlign: 'center' },
  input: {
    fontFamily: fonts.mono, fontSize: 14, color: colors.text,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  btn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.md,
  },
  btnText: { fontFamily: fonts.mono, fontSize: 15, color: colors.bg, fontWeight: '700' },
});
