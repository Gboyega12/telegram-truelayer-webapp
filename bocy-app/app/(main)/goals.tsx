import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, radius } from '@/theme';

const SITUATIONS = [
  { key: 'in_debt', label: 'In debt' },
  { key: 'breaking_even', label: 'Breaking even' },
  { key: 'saving_slowly', label: 'Saving slowly' },
  { key: 'saving_well', label: 'Saving well' },
  { key: 'other', label: 'Other' },
];

const ONE_YEAR_GOALS = [
  { key: 'clear_debt', label: 'Clear debt' },
  { key: 'emergency_fund', label: 'Build emergency fund' },
  { key: 'save_target', label: 'Hit a savings target' },
  { key: 'reduce_spending', label: 'Reduce spending' },
  { key: 'invest', label: 'Start investing' },
  { key: 'other', label: 'Other' },
];

const TWO_YEAR_GOALS = [
  { key: 'buy_home', label: 'Buy a home' },
  { key: 'go_freelance', label: 'Go freelance' },
  { key: 'financial_freedom', label: 'Financial freedom' },
  { key: 'clear_debt', label: 'Clear all debt' },
  { key: 'invest', label: 'Grow investments' },
  { key: 'other', label: 'Other' },
];

export default function Goals() {
  const { csvData } = useLocalSearchParams<{ csvData: string }>();
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState('');
  const [oneYear, setOneYear] = useState('');
  const [twoYear, setTwoYear] = useState('');
  const [otherText, setOtherText] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return Alert.alert('Error', 'Not signed in.'); }

    const oneYearVal = oneYear === 'other' ? `other:${otherText}` : oneYear;
    const twoYearVal = twoYear === 'other' ? `other:${otherText}` : twoYear;
    const amount = targetAmount ? parseFloat(targetAmount) : null;

    const { error } = await supabase.from('goals').upsert({
      user_id: user.id,
      current_situation: situation,
      one_year_goal: oneYearVal,
      two_year_goal: twoYearVal,
      target_amount: amount,
    }, { onConflict: 'user_id' });

    setLoading(false);
    if (error) return Alert.alert('Error', error.message);
    router.push({ pathname: '/(main)/processing', params: { csvData } });
  };

  const renderOption = (items: { key: string; label: string }[], selected: string, onSelect: (k: string) => void) => (
    <View style={s.options}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[s.option, selected === item.key && s.optionActive]}
          onPress={() => onSelect(item.key)}
        >
          <Text style={[s.optionText, selected === item.key && s.optionTextActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const steps = [
    {
      question: "What's your financial situation?",
      content: renderOption(SITUATIONS, situation, setSituation),
      canProceed: !!situation,
    },
    {
      question: 'What do you want to achieve this year?',
      content: (
        <>
          {renderOption(ONE_YEAR_GOALS, oneYear, setOneYear)}
          {oneYear === 'other' && (
            <TextInput style={s.input} placeholder="Describe your goal" placeholderTextColor={colors.dim} value={otherText} onChangeText={setOtherText} />
          )}
          {oneYear === 'save_target' && (
            <TextInput style={s.input} placeholder="Target amount (e.g. 5000)" placeholderTextColor={colors.dim} value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" />
          )}
        </>
      ),
      canProceed: !!oneYear,
    },
    {
      question: 'And in two years?',
      content: renderOption(TWO_YEAR_GOALS, twoYear, setTwoYear),
      canProceed: !!twoYear,
    },
  ];

  const current = steps[step];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <Text style={s.step}>Step {step + 1} of 3</Text>
      <Text style={s.question}>{current.question}</Text>
      {current.content}
      <TouchableOpacity
        style={[s.btn, !current.canProceed && s.btnDisabled]}
        disabled={!current.canProceed || loading}
        onPress={() => step < 2 ? setStep(step + 1) : handleSave()}
      >
        <Text style={s.btnText}>{step < 2 ? 'Next' : loading ? 'Saving...' : 'Start analysis'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: 80, paddingBottom: 40 },
  step: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, marginBottom: spacing.sm },
  question: { fontFamily: fonts.mono, fontSize: 22, color: colors.text, marginBottom: spacing.lg },
  options: { marginBottom: spacing.lg },
  option: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  optionActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  optionText: { fontFamily: fonts.mono, fontSize: 14, color: colors.text2 },
  optionTextActive: { color: colors.accent },
  input: {
    fontFamily: fonts.mono, fontSize: 14, color: colors.text,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  btn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontFamily: fonts.mono, fontSize: 15, color: colors.bg, fontWeight: '700' },
});
