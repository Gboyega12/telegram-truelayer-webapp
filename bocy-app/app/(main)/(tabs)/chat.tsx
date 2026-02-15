import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../../../theme';
import { supabase } from '../../../lib/supabase';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTIONS = [
  'How can I save more each month?',
  'Am I spending too much on subscriptions?',
  'What should I prioritise — debt or savings?',
  'How long until I reach my goal?',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [analysisRes, goalsRes] = await Promise.all([
        supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('goals').select('*').eq('user_id', user.id).single(),
      ]);

      const ctx: any = {};
      if (analysisRes.data && analysisRes.data.length > 0) {
        const a = analysisRes.data[0];
        ctx.monthly_income = a.monthly_income;
        ctx.monthly_spending = a.monthly_spending;
        ctx.surplus = a.surplus;
        ctx.archetype = a.archetype;
        ctx.top_move = a.top_move;
      }
      if (goalsRes.data) {
        ctx.goals = goalsRes.data;
      }
      setContext(ctx);
    } catch (err) {
      console.error('Failed to load chat context:', err);
    }
  };

  const getApiUrl = () => {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) return `${envUrl}/api/chat`;
    // For web, use relative URL; for native, this needs to be configured
    if (Platform.OS === 'web') return '/api/chat';
    return '/api/chat';
  };

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content || sending) return;

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const resp = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context,
        }),
      });

      const data = await resp.json();

      if (data.success && data.text) {
        setMessages([...newMessages, { role: 'assistant', content: data.text }]);
      } else {
        setMessages([...newMessages, {
          role: 'assistant',
          content: 'I\'m having trouble connecting right now. Please try again in a moment.',
        }]);
      }
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Something went wrong. Please check your connection and try again.',
      }]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Chat with AI</Text>
          <Text style={s.headerSubtitle}>Ask anything about your finances</Text>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={s.messagesWrap}
          contentContainerStyle={s.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={s.welcomeWrap}>
              <Text style={s.welcomeText}>
                I have access to your financial data. Ask me anything — I'm here to help.
              </Text>
              <View style={s.suggestions}>
                {SUGGESTIONS.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.suggestionBtn}
                    onPress={() => sendMessage(q)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.suggestionText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, i) => (
            <View
              key={i}
              style={[s.messageBubble, msg.role === 'user' ? s.userBubble : s.aiBubble]}
            >
              <Text style={[s.messageText, msg.role === 'user' ? s.userText : s.aiText]}>
                {msg.content}
              </Text>
            </View>
          ))}

          {sending && (
            <View style={[s.messageBubble, s.aiBubble]}>
              <ActivityIndicator color={theme.colors.accent} size="small" />
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder="Ask a question..."
            placeholderTextColor={theme.colors.muted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || sending}
            activeOpacity={0.7}
          >
            <Text style={s.sendBtnText}>{'\u2191'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  headerSubtitle: { fontSize: 13, color: theme.colors.dim, marginTop: 2 },

  messagesWrap: { flex: 1 },
  messagesContent: { paddingHorizontal: 20, paddingVertical: 16 },

  // Welcome state
  welcomeWrap: { paddingVertical: 20 },
  welcomeText: { fontSize: 15, color: theme.colors.text2, lineHeight: 23, marginBottom: 20, textAlign: 'center' },
  suggestions: { gap: 10 },
  suggestionBtn: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: 14 },
  suggestionText: { fontSize: 14, color: theme.colors.text2 },

  // Messages
  messageBubble: { maxWidth: '85%', borderRadius: theme.radius.md, padding: 14, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: theme.colors.accentDim },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  messageText: { fontSize: 14, lineHeight: 21 },
  userText: { color: theme.colors.text },
  aiText: { color: theme.colors.text2 },

  // Input
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 10 },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: 16, paddingVertical: 12, color: theme.colors.text, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 18, fontWeight: '700', color: theme.colors.bg },
});
