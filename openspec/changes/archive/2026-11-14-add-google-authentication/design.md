# Design

## Context

The ExpenseFlow mobile client runs on Expo SDK 58 with React Native 0.88 and Supabase. Currently, `src/lib/supabase.ts` instantiates the Supabase client without an encrypted storage engine, meaning session tokens are lost upon application termination. Additionally, all app routes are currently mounted under a single layout (`src/app/_layout.tsx`) without authentication gates or user context. Because the backend is already shared with a production website using Google OAuth, mobile authentication must integrate directly with the existing `auth.users` table and Google OAuth configuration. (See `proposal.md` for motivation).

## Goals / Non-Goals

**Goals:**
- Provide a native, single-tap Google authentication experience on Android and iOS using `@react-native-google-signin/google-signin` and Supabase's `signInWithIdToken`.
- Securely store Supabase session credentials in hardware-encrypted storage using `expo-secure-store`.
- Enforce route protection via Expo Router route groups: `(auth)` for unauthenticated screens and `(tabs)` for protected features.
- Provide a responsive `AuthProvider` and `useAuth()` hook that coordinates session restoration, real-time auth state changes, and automatic token refresh.
- Deliver a streamlined, dark-theme (`bg-slate-950`) login screen aligned with ExpenseFlow's visual design language.

**Non-Goals:**
- Supporting browser-based preview authentication (`npm run web`); this change targets native mobile exclusively.
- Introducing alternative authentication methods (e.g., email/password, magic links, Apple Sign-In).
- Client-side database seeding or initial user onboarding (managed by existing backend database triggers).

## Decisions

### 1. Native Google Sign-In (`signInWithIdToken`) vs. In-App Browser OAuth (`signInWithOAuth`)
- **Decision**: Use `@react-native-google-signin/google-signin` to obtain a Google `idToken` and pass it directly to `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`.
- **Rationale**: Browser redirects (`WebBrowser.openAuthSessionAsync`) feel clunky on mobile, involve jarring context switches, and occasionally trigger Google webview security blocks. Native Google Sign-In renders the native OS bottom-sheet / One-Tap prompt directly within the app.
- **Alternatives Considered**: In-app browser OAuth flow using deep links (`expenseflowapp://auth/callback`). While simpler to configure (no SHA-1 fingerprints needed), it degrades the mobile UX.

### 2. Encrypted Session Persistence Engine (`expo-secure-store`)
- **Decision**: Implement a custom `SupportedStorage` interface adapter backed by `expo-secure-store` and pass it to `createClient(..., { auth: { storage: ExpoSecureStoreAdapter } })`.
- **Rationale**: Conforms to the project's security guardrails defined in `AGENTS.md`. `expo-secure-store` utilizes Android Keystore and iOS Keychain, ensuring session tokens and refresh tokens are encrypted at rest.
- **Alternatives Considered**: `@react-native-async-storage/async-storage`. Rejected because AsyncStorage stores tokens in unencrypted plaintext.

### 3. Route Protection Architecture (Expo Router Groups & Root Guard)
- **Decision**: Restructure `src/app` into two route groups: `(auth)/login.tsx` and `(tabs)/...`. A root layout hook observes `useAuth()` state and calls `router.replace('/(auth)/login')` when unauthenticated or `router.replace('/(tabs)')` when authenticated.
- **Rationale**: Group-based routing is Expo Router's recommended architectural pattern. It cleanly isolates navigation trees, prevents accidental back-navigation to the login screen, and eliminates UI flashing by holding the splash screen until auth initialization finishes.
- **Alternatives Considered**: A conditional stack navigator in `_layout.tsx` swapping screens dynamically. Rejected because it complicates deep linking and tab state persistence.

### 4. Global Auth State Distribution (`AuthProvider` Context)
- **Decision**: Create an `AuthContext` and `useAuth()` hook wrapping `supabase.auth.onAuthStateChange`.
- **Rationale**: Coordinates session hydration from `expo-secure-store`, provides reactive `user`, `session`, and `isLoading` properties, and exposes clean `signInWithGoogle` and `signOut` helper functions across the component hierarchy without third-party state libraries.
- **Alternatives Considered**: React Query cache or Zustand store. Rejected because Supabase's native `onAuthStateChange` subscription pattern is already event-driven and easily bound to a lightweight Context.

## Architecture & Authentication Flow

```
[User taps "Sign in with Google"]
               │
               ▼
   GoogleSignin.hasPlayServices()
   GoogleSignin.signIn()
               │
               ▼
       Returns Google idToken
               │
               ▼
   supabase.auth.signInWithIdToken({
     provider: 'google',
     token: idToken,
   })
               │
               ▼
   Supabase validates token against Google API
   Matches existing auth.users record (via email/sub)
   Issues Supabase JWT + Refresh Token
               │
               ▼
   ExpoSecureStoreAdapter persists session locally
               │
               ▼
   supabase.auth.onAuthStateChange('SIGNED_IN') fires
               │
               ▼
   AuthContext updates session & user state
               │
               ▼
   Root Route Guard executes router.replace('/(tabs)')
               │
               ▼
   TanStack Query fetches categories & expenses (RLS: auth.uid() = user_id)
```

## Risks / Trade-offs

- **[Risk: Android SHA-1 mismatch]** → Google Sign-In returns `DEVELOPER_ERROR` (code 10) if the client package name or SHA-1 fingerprint in Google Cloud Console doesn't match the local build keystore.
  - *Mitigation*: Clearly document how to extract the debug SHA-1 from `~/.android/debug.keystore` and add it to Google Cloud Console along with production EAS fingerprints.
- **[Risk: SecureStore 2KB size limitation on older Android devices]** → Storing large Supabase session objects could exceed storage limits.
  - *Mitigation*: Ensure the adapter stores only the essential serialized session payload (`access_token`, `refresh_token`, `expires_at`, `user`), or implement chunking if necessary.
- **[Risk: Native build requirement]** → `@react-native-google-signin/google-signin` cannot run inside standard Expo Go.
  - *Mitigation*: Configure the Expo config plugin in `app.json` and use Expo Continuous Native Generation (CNG) via `expo-dev-client` (`npx expo run:android` / `npx expo run:ios`).

## Migration Plan

1. Install native modules: `npx expo install @react-native-google-signin/google-signin expo-secure-store`.
2. Configure `app.json`: Add plugin configuration for `@react-native-google-signin/google-signin`, set iOS `bundleIdentifier`, and verify Android `package`.
3. Configure Google Cloud Console and Supabase Dashboard with Web, Android, and iOS client IDs.
4. Implement storage adapter in `src/lib/supabase.ts`.
5. Implement `AuthContext` and reorganize route structure in `src/app`.
6. Run local prebuild and verify native build via `npx expo run:android` / `npx expo run:ios`.
