import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';

type MenuItem = {
  label: string;
  icon: string;
  onPress: () => void;
  color?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [showSecurity, setShowSecurity] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account, all your analyses, goals, and personal data. This cannot be undone.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, delete my account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final confirmation',
              'This action is irreversible. All your data will be permanently removed.',
              [
                { text: 'Keep my account', style: 'cancel' },
                {
                  text: 'Delete permanently',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase.from('analyses').delete().eq('user_id', user.id);
                        await supabase.from('goals').delete().eq('user_id', user.id);
                      }
                      await supabase.auth.signOut();
                      Alert.alert('Account deleted', 'Your account and all data have been removed.');
                    } catch (err) {
                      Alert.alert('Something went wrong', 'Please try again or contact support.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const menuItems: MenuItem[] = [
    {
      label: 'Add Account',
      icon: '+',
      onPress: () => router.push('/(main)/connect' as any),
    },
    {
      label: 'Report a Bug',
      icon: '\u2691',
      onPress: () => Alert.alert('Report a Bug', 'Please email us at support@bocy.app with details of the issue.'),
    },
    {
      label: 'Notifications',
      icon: '\u266A',
      onPress: () => Alert.alert('Notifications', 'Notification preferences will be available soon.'),
    },
    {
      label: 'Goals',
      icon: '\u25CE',
      onPress: () => router.push('/(main)/goals' as any),
    },
    {
      label: 'Agreements',
      icon: '\u2637',
      onPress: () => Alert.alert('Agreements', 'Terms of service and privacy policy will be available soon.'),
    },
    {
      label: 'Security',
      icon: '\u2616',
      onPress: () => setShowSecurity(!showSecurity),
    },
  ];

  const initial = userName ? userName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header with back */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backText}>{'\u2190'} Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* User info */}
        <View style={s.userSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <Text style={s.userName}>{userName || 'User'}</Text>
          <Text style={s.userEmail}>{email}</Text>
        </View>

        {/* Menu items */}
        <View style={s.menu}>
          {menuItems.map((item, i) => (
            <View key={i}>
              <TouchableOpacity
                style={s.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={s.menuIconWrap}>
                  <Text style={[s.menuIcon, item.color ? { color: item.color } : null]}>{item.icon}</Text>
                </View>
                <Text style={[s.menuLabel, item.color ? { color: item.color } : null]}>{item.label}</Text>
                <Text style={s.menuChevron}>
                  {item.label === 'Security' ? (showSecurity ? '\u25BE' : '\u25B8') : '\u25B8'}
                </Text>
              </TouchableOpacity>

              {/* Security sub-menu */}
              {item.label === 'Security' && showSecurity && (
                <View style={s.securityMenu}>
                  <TouchableOpacity style={s.securityItem} onPress={handleSignOut} activeOpacity={0.7}>
                    <Text style={s.securityItemText}>Sign out</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.securityItem} onPress={handleDeleteAccount} activeOpacity={0.7}>
                    <Text style={[s.securityItemText, { color: theme.colors.coral }]}>Delete account</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingBottom: 40 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backBtn: { width: 60 },
  backText: { fontSize: 14, color: theme.colors.accent },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },

  // User section
  userSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.accentDim, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText: { fontFamily: 'SpaceMono', fontSize: 28, fontWeight: '700', color: theme.colors.accent },
  userName: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  userEmail: { fontSize: 14, color: theme.colors.dim },

  // Menu
  menu: { paddingHorizontal: 20, marginTop: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuIcon: { fontSize: 16, color: theme.colors.text2 },
  menuLabel: { flex: 1, fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  menuChevron: { fontSize: 14, color: theme.colors.muted },

  // Security sub-menu
  securityMenu: { paddingLeft: 50, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: theme.radius.sm, marginBottom: 4 },
  securityItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  securityItemText: { fontSize: 15, color: theme.colors.text2 },
});
