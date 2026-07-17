import 'react-native-url-polyfill/auto';

import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from './env';
import { supabaseStorage } from './supabase-storage';

let client: SupabaseClient | undefined;

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabasePublishableKey);

export function getSupabaseClient() {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  client ??= createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: processLock,
      persistSession: true,
      storage: supabaseStorage,
    },
  });

  return client;
}

export function registerSupabaseAuthLifecycle() {
  if (process.env.EXPO_OS === 'web' || !isSupabaseConfigured) {
    return () => undefined;
  }

  const supabase = getSupabaseClient();
  const updateRefreshState = (state: string) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };

  updateRefreshState(AppState.currentState);
  const subscription = AppState.addEventListener('change', updateRefreshState);

  return () => {
    subscription.remove();
    supabase.auth.stopAutoRefresh();
  };
}
