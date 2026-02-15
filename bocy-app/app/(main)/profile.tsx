import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { confirm } from '@/lib/confirm';
import { colors, fonts, spacing, radius } from '@/theme';

export default function Profile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showSecurity, setShowSecurity] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setName(user.user_metadata?.full_name || '');
        setEmail(user.email || '');
      }
    })();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  const handleDeleteAccount = () => {
    confirm(
      'Delete account',
      'This will permanently delete your account and all data. This cannot be undone.',
      async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return Alert.alert('Error', 'Not signed in.');

          const res = await fetch('/api/delete-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          const data = await res.json();
          if (data.success) {
            await supabase.auth.signOut();
            router.replace('/(auth)/sign-in');
          } else {
            Alert.alert('Error', data.error || 'Failed to delete account.');
          }
        } catch (err: any) {
          Alert.alert('Error', err.message);
        }
      },
      'Delete',
      true
    );
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      {/* Avatar */}
      <View style={s.avatarRow}>
        <View style={s.avatar}>
          <Text style={s.initials}>{initials || '?'}</Text>
        </View>
        <View>
          <Text style={s.name}>{name}</Text>
          <Text style={s.email}>{email}</Text>
        </View>
      </View>

      {/* Menu */}
      <MenuItem icon="add-circle-outline" label="Add Account" onPress={() => router.push('/(main)/connect')} />
      <MenuItem icon="flag-outline" label="Goals" onPress={() => router.push('/(main)/goals')} />
      <MenuItem icon="bug-outline" label="Report a Bug" onPress={() => Linking.openURL(`mailto:support@bocy.app?subject=Bug Report&body=Describe the issue...`)} />
      <MenuItem icon="notifications-outline" label="Notifications" onPress={() => Alert.alert('Coming soon')} />
      <MenuItem icon="document-text-outline" label="Agreements" onPress={() => Alert.alert('Coming soon')} />

      {/* Security */}
      <TouchableOpacity style={s.menuItem} onPress={() => setShowSecurity(!showSecurity)}>
        <Ionicons name="shield-outline" size={20} color={colors.text2} />
        <Text style={s.menuLabel}>Security</Text>
        <Ionicons name={showSecurity ? 'chevron-up' : 'chevron-down'} size={16} color={colors.dim} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {showSecurity && (
        <View style={s.securityPanel}>
          <TouchableOpacity style={s.securityBtn} onPress={handleSignOut}>
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.securityBtn, s.deleteBtn]} onPress={handleDeleteAccount}>
            <Text style={s.deleteText}>Delete account</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress}>
      <Ionicons name={icon as any} size={20} color={colors.text2} />
      <Text style={s.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.dim} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center',
  },
  initials: { fontFamily: fonts.mono, fontSize: 20, color: colors.accent, fontWeight: '700' },
  name: { fontFamily: fonts.mono, fontSize: 18, color: colors.text },
  email: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuLabel: { fontFamily: fonts.mono, fontSize: 14, color: colors.text2 },
  securityPanel: { paddingVertical: spacing.md },
  securityBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 12, alignItems: 'center', marginBottom: spacing.sm,
  },
  signOutText: { fontFamily: fonts.mono, fontSize: 14, color: colors.text2 },
  deleteBtn: { borderColor: colors.coral },
  deleteText: { fontFamily: fonts.mono, fontSize: 14, color: colors.coral },
});
