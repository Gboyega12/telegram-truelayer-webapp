import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, radius } from '@/theme';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'How can I save more?',
  'Am I spending too much on food?',
  'What should I prioritise first?',
  'How do I build an emergency fund?',
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: a } = await supabase
        .from('analyses').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single();
      const { data: g } = await supabase.from('goals').select('*').eq('user_id', user.id).single();

      if (a) {
        setContext({
          monthly_income: a.monthly_income,
          monthly_spending: a.monthly_spending,
          surplus: a.surplus,
          archetype: a.archetype,
          goals: g ? { current_situation: g.current_situation, one_year_goal: g.one_year_goal, two_year_goal: g.two_year_goal } : null,
          top_move: a.top_move ? { action: a.top_move.action } : null,
        });
      }
    })();
  }, []);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context }),
      });
      const data = await res.json();
      if (data.success && data.text) {
        setMessages([...newMessages, { role: 'assistant', content: data.text }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Network error. Please check your connection.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.messagesContent}>
        {/* Welcome */}
        {messages.length === 0 && (
          <View style={s.welcome}>
            <Text style={s.welcomeTitle}>Chat with Bocy</Text>
            <Text style={s.welcomeBody}>Ask anything about your finances. I have your analysis loaded.</Text>
            <View style={s.suggestions}>
              {SUGGESTIONS.map((q, i) => (
                <TouchableOpacity key={i} style={s.suggestion} onPress={() => send(q)}>
                  <Text style={s.suggestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <View key={i} style={[s.bubble, msg.role === 'user' ? s.userBubble : s.assistantBubble]}>
            <Text style={[s.bubbleText, msg.role === 'user' ? s.userText : s.assistantText]}>{msg.content}</Text>
          </View>
        ))}

        {loading && (
          <View style={[s.bubble, s.assistantBubble]}>
            <Text style={s.typing}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Ask a question..."
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity style={s.sendBtn} onPress={() => send(input)} disabled={loading || !input.trim()}>
          <Ionicons name="send" size={20} color={input.trim() ? colors.accent : colors.muted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: spacing.sm },
  welcome: { marginBottom: spacing.lg },
  welcomeTitle: { fontFamily: fonts.mono, fontSize: 20, color: colors.text, marginBottom: spacing.xs },
  welcomeBody: { fontFamily: fonts.mono, fontSize: 13, color: colors.dim, marginBottom: spacing.md },
  suggestions: { gap: spacing.sm },
  suggestion: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: spacing.md },
  suggestionText: { fontFamily: fonts.mono, fontSize: 13, color: colors.text2 },
  bubble: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, maxWidth: '85%' },
  userBubble: { backgroundColor: colors.accentDim, alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: colors.surface, alignSelf: 'flex-start' },
  bubbleText: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20 },
  userText: { color: colors.accent },
  assistantText: { color: colors.text2 },
  typing: { fontFamily: fonts.mono, fontSize: 13, color: colors.dim, fontStyle: 'italic' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg,
  },
  input: {
    flex: 1, fontFamily: fonts.mono, fontSize: 14, color: colors.text,
    backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: 10, maxHeight: 100,
  },
  sendBtn: { paddingLeft: spacing.sm, paddingBottom: 10 },
});
