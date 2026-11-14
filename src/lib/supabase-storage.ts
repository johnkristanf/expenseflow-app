import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'supabase.session';

// ponytail: single key, no chunking. Supabase session JSON ~1KB. Add chunking if SecureStore throws on large sessions.
export const ExpoSecureStoreAdapter = {
  getItem: (_key: string) => SecureStore.getItemAsync(STORAGE_KEY),
  setItem: (_key: string, value: string) => SecureStore.setItemAsync(STORAGE_KEY, value),
  removeItem: (_key: string) => SecureStore.deleteItemAsync(STORAGE_KEY),
};
