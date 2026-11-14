# Proposal

## Why

The ExpenseFlow mobile application currently lacks an authentication entry point and route protection, leaving database calls unauthenticated and failing Row Level Security (RLS) constraints that require `auth.uid() = user_id`. Since the web version already shares the same Supabase backend and Google identity provider, introducing native Google Sign-In allows users to authenticate seamlessly with a single tap, securely persist their session credentials on the device, and instantly access their synchronized financial records.

## What Changes

- Add native Google Sign-In powered by `@react-native-google-signin/google-signin` and Supabase's `signInWithIdToken` for seamless Android One-Tap and iOS authentication without browser popups.
- Integrate an encrypted session storage adapter using `expo-secure-store` for the Supabase client so user sessions persist across mobile app restarts and automatically refresh tokens.
- Restructure the Expo Router navigation tree into group-based routes: `src/app/(auth)/login.tsx` for unauthenticated entry and `src/app/(tabs)/...` for protected screens, governed by a root authentication guard.
- Introduce an `AuthProvider` and `useAuth` hook managing user identity, active session status, sign-in, and sign-out lifecycles.
- Build a dark-theme (`bg-slate-950`) login screen presenting animated ExpenseFlow branding, value proposition copy, and a Google Sign-In action button.

## Capabilities

### New Capabilities
- `user-authentication`: Manages user authentication lifecycles via native Google Sign-In with Supabase, encrypted credential persistence via Expo SecureStore, and route-level access control.

### Modified Capabilities
<!-- None -->

## Impact

- **Dependencies**: Adds `@react-native-google-signin/google-signin` and `expo-secure-store`.
- **Configuration**: Modifies `app.json` to register the Google Sign-In Expo config plugin, custom iOS URL schemes, and the iOS bundle identifier (`com.johnkristan01.expenseflowapp`).
- **Client & Routing**: Updates `src/lib/supabase.ts` with custom storage, creates `src/app/(auth)/login.tsx`, reorganizes `src/app/_layout.tsx` to wrap with `AuthProvider` and enforce route guarding.
- **Backend & External**: Requires Google Cloud Console OAuth Client IDs (Android SHA-1 fingerprint and iOS client ID) authorized within Supabase Authentication settings.
