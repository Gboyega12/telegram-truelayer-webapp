import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={s.iconWrap}>
      <Text style={[s.iconText, focused && s.iconTextActive]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.bg,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontFamily: 'SpaceMono',
          fontSize: 10,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon label={focused ? '\u2302' : '\u2302'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused }) => <TabIcon label={focused ? '\u2611' : '\u2610'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => <TabIcon label={focused ? '\u2726' : '\u2727'} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    color: theme.colors.muted,
  },
  iconTextActive: {
    color: theme.colors.accent,
  },
});
