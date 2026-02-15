import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';

type GoalStep = 'current' | 'oneYear' | 'twoYear';

const CURRENT_OPTIONS = [
  { id: 'in_debt', label: 'I\'m in debt', desc: 'Paying off loans, credit cards, or buy-now-pay-later', icon: '!' },
  { id: 'breaking_even', label: 'Breaking even', desc: 'My income covers expenses, but there\'s not much left', icon: '~' },
  { id: 'saving_slowly', label: 'Saving, but slowly', desc: 'I have some surplus each month and want to do more', icon: '+' },
  { id: 'saving_well', label: 'Saving comfortably', desc: 'Consistent savings — looking to optimise further', icon: '*' },
  { id: 'other', label: 'Something else', desc: 'Describe your situation in your own words', icon: '..', hasInput: true },
];

const ONE_YEAR_OPTIONS = [
  { id: 'clear_debt', label: 'Clear my debt', desc: 'Become debt-free or make a significant dent' },
  { id: 'emergency_fund', label: 'Build an emergency fund', desc: 'Save 3 to 6 months of essential expenses' },
  { id: 'save_target', label: 'Save a specific amount', desc: 'Set a target and work towards it', hasAmount: true },
  { id: 'reduce_spending', label: 'Spend less, keep more', desc: 'Cut waste without sacrificing quality of life' },
  { id: 'other', label: 'Something else', desc: 'Tell us your goal in your own words', hasInput: true },
];

const TWO_YEAR_OPTIONS = [
  { id: 'buy_home', label: 'Buy a home', desc: 'Save towards a deposit' },
  { id: 'invest', label: 'Start investing', desc: 'Build long-term wealth' },
  { id: 'go_freelance', label: 'Go freelance or start a business', desc: 'Build a financial runway' },
  { id: 'financial_freedom', label: 'Financial freedom', desc: 'Work towards passive income covering my expenses' },
  { id: 'other', label: 'Something else', desc: 'Share your bigger-picture goal', hasInput: true },
];

export default function GoalsScreen() {
  const { csvData, source } = useLocalSearchParams<{ csvData: string; source: string }>();
  const [step, setStep] = useState<GoalStep>('current');
  const [current, setCurrent] = useState('');
  const [oneYear, setOneYear] = useState('');
  const [twoYear, setTwoYear] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [customCurrent, setCustomCurrent] = useState('');
  const [customOneYear, setCustomOneYear] = useState('');
  const [customTwoYear, setCustomTwoYear] = useState('');
  const router = useRouter();

  const handleNext = async () => {
    if (step === 'current' && current) {
      if (current === 'other' && !customCurrent.trim()) return;
      setStep('oneYear');
    } else if (step === 'oneYear' && oneYear) {
      if (oneYear === 'other' && !customOneYear.trim()) return;
      setStep('twoYear');
    } else if (step === 'twoYear' && twoYear) {
      if (twoYear === 'other' && !customTwoYear.trim()) return;

      const currentVal = current === 'other' ? `other:${customCurrent.trim()}` : current;
      const oneYearVal = oneYear === 'other' ? `other:${customOneYear.trim()}` : oneYear;
      const twoYearVal = twoYear === 'other' ? `other:${customTwoYear.trim()}` : twoYear;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('goals').upsert({
          user_id: user.id,
          current_situation: currentVal,
          one_year_goal: oneYearVal,
          two_year_goal: twoYearVal,
          target_amount: targetAmount ? parseInt(targetAmount) : null,
        }, { onConflict: 'user_id' });
      }

      router.push({
        pathname: '/(main)/processing' as any,
        params: {
          csvData,
          source,
          goals: JSON.stringify({
            current: currentVal,
            oneYear: oneYearVal,
            twoYear: twoYearVal,
            targetAmount: targetAmount ? parseInt(targetAmount) : null,
          }),
        },
      });
    }
  };

  const handleBack = () => {
    if (step === 'oneYear') setStep('current');
    else if (step === 'twoYear') setStep('oneYear');
  };

  const stepNumber = step === 'current' ? 1 : step === 'oneYear' ? 2 : 3;
  const selectedValue = step === 'current' ? current : step === 'oneYear' ? oneYear : twoYear;
  const setSelected = step === 'current' ? setCurrent : step === 'oneYear' ? setOneYear : setTwoYear;
  const customText = step === 'current' ? customCurrent : step === 'oneYear' ? customOneYear : customTwoYear;
  const setCustomText = step === 'current' ? setCustomCurrent : step === 'oneYear' ? setCustomOneYear : setCustomTwoYear;

  const options = step === 'current' ? CURRENT_OPTIONS : step === 'oneYear' ? ONE_YEAR_OPTIONS : TWO_YEAR_OPTIONS;

  const canContinue = selectedValue && (
    selectedValue !== 'other' || customText.trim().length > 0
  );

  const titles: Record<GoalStep, { title: string; subtitle: string }> = {
    current: { title: 'Where are you right now?', subtitle: 'This helps us understand your starting point — no judgement here.' },
    oneYear: { title: 'What matters most to you this year?', subtitle: 'Pick the goal that would make the biggest difference over the next 12 months.' },
    twoYear: { title: 'And looking further ahead?', subtitle: 'Your longer-term ambition helps shape the strategy we build for you.' },
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Progress */}
        <View style={s.progress}>
          {[1, 2, 3].map(n => (
            <View
              key={n}
              style={[s.progressDot, n <= stepNumber && s.progressDotActive]}
            />
          ))}
        </View>

        {step !== 'current' && (
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={s.header}>
          <Text style={s.stepLabel}>Step {stepNumber} of 3</Text>
          <Text style={s.title}>{titles[step].title}</Text>
          <Text style={s.subtitle}>{titles[step].subtitle}</Text>
        </View>

        {/* Options */}
        <View style={s.options}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[s.option, selectedValue === opt.id && s.optionSelected]}
              onPress={() => setSelected(opt.id)}
              activeOpacity={0.7}
            >
              <View style={s.optionHeader}>
                {'icon' in opt && (
                  <View style={[s.optionIcon, selectedValue === opt.id && s.optionIconSelected]}>
                    <Text style={[s.optionIconText, selectedValue === opt.id && s.optionIconTextSelected]}>
                      {(opt as any).icon}
                    </Text>
                  </View>
                )}
                <View style={s.optionText}>
                  <Text style={[s.optionLabel, selectedValue === opt.id && s.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={s.optionDesc}>{opt.desc}</Text>
                </View>
              </View>

              {/* Amount input for save_target */}
              {'hasAmount' in opt && (opt as any).hasAmount && selectedValue === opt.id && (
                <TextInput
                  style={s.amountInput}
                  placeholder="e.g. 5000"
                  placeholderTextColor={theme.colors.muted}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="number-pad"
                  autoFocus
                />
              )}

              {/* Free-text input for "other" */}
              {'hasInput' in opt && (opt as any).hasInput && selectedValue === opt.id && (
                <TextInput
                  style={s.customInput}
                  placeholder="Type here..."
                  placeholderTextColor={theme.colors.muted}
                  value={customText}
                  onChangeText={setCustomText}
                  multiline
                  autoFocus
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue */}
        {canContinue ? (
          <TouchableOpacity style={s.continueBtn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={s.continueBtnText}>
              {step === 'twoYear' ? 'Analyse my finances' : 'Continue'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  progressDotActive: {
    backgroundColor: theme.colors.accent,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    color: theme.colors.dim,
    fontSize: 14,
  },
  header: {
    marginBottom: 28,
  },
  stepLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: theme.colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.dim,
    lineHeight: 22,
  },
  options: {
    gap: 12,
  },
  option: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 18,
  },
  optionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(232,200,114,0.06)',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconSelected: {
    backgroundColor: theme.colors.accentDim,
  },
  optionIconText: {
    fontFamily: 'SpaceMono',
    fontSize: 16,
    color: theme.colors.muted,
  },
  optionIconTextSelected: {
    color: theme.colors.accent,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 3,
  },
  optionLabelSelected: {
    color: theme.colors.accent,
  },
  optionDesc: {
    fontSize: 13,
    color: theme.colors.dim,
  },
  amountInput: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.accentDim,
    borderRadius: theme.radius.sm,
    padding: 12,
    color: theme.colors.text,
    fontSize: 18,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
  },
  customInput: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.accentDim,
    borderRadius: theme.radius.sm,
    padding: 14,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  continueBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: 18,
    alignItems: 'center',
    marginTop: 28,
  },
  continueBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.bg,
    letterSpacing: 1,
  },
});
