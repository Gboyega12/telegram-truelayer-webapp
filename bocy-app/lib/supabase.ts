import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Secure token storage for native, localStorage for web
const isWeb = Platform.OS === 'web' && typeof localStorage !== 'undefined';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    if (Platform.OS !== 'web') {
      return SecureStore.getItemAsync(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (isWeb) {
      localStorage.setItem(key, value);
      return;
    }
    if (Platform.OS !== 'web') {
      return SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: (key: string) => {
    if (isWeb) {
      localStorage.removeItem(key);
      return;
    }
    if (Platform.OS !== 'web') {
      return SecureStore.deleteItemAsync(key);
    }
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: ExpoSecureStoreAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
