# Tasks

## 1. Dependencies and Native Configuration

- [x] 1.1 Install `@react-native-google-signin/google-signin` and `expo-secure-store` using `npx expo install` and verify `package.json` updates cleanly.
- [x] 1.2 Update `app.json` to include `@react-native-google-signin/google-signin` config plugin, set `ios.bundleIdentifier` to `com.johnkristan01.expenseflowapp`, and ensure Android package matches.
- [x] 1.3 Add environment variable declarations for Google Web Client ID (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) and iOS Client ID (`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) in `.env.example`.

## 2. Encrypted Supabase Storage Adapter

- [x] 2.1 Implement `ExpoSecureStoreAdapter` in `src/lib/supabase-storage.ts` providing `getItem`, `setItem`, and `removeItem` with JSON chunking/serialization.
- [x] 2.2 Update `src/lib/supabase.ts` to attach `ExpoSecureStoreAdapter` to `auth.storage` in `createClient` and verify TypeScript compilation without errors.

## 3. Google Sign-In Service and Native Configuration

- [x] 3.1 Create Google Sign-In helper module in `src/lib/google-auth.ts` initializing `GoogleSignin.configure` with environment client IDs.
- [x] 3.2 Implement `signInWithGoogle` exchanging the native Google `idToken` with `supabase.auth.signInWithIdToken` and error handling for user cancellations.
- [x] 3.3 Implement `signOutFromGoogleAndSupabase` revoking Supabase session and calling `GoogleSignin.signOut()`.

## 4. Auth State Context and Hook

- [x] 4.1 Implement `AuthProvider` and `useAuth` hook in `src/contexts/auth-context.tsx` managing `session`, `user`, `isLoading`, and auth actions using `supabase.auth.onAuthStateChange`.
- [x] 4.2 Add unit test for `AuthProvider` or auth helper in `src/tests/auth.test.ts` verifying session state propagation.

## 5. Navigation Tree Restructuring and Route Guard

- [x] 5.1 Restructure routes by moving existing tab routes into `src/app/(tabs)/` with `(tabs)/_layout.tsx`, `index.tsx`, and `explore.tsx`.
- [x] 5.2 Create `src/app/(auth)/_layout.tsx` for unauthenticated screens.
- [x] 5.3 Implement route guard logic in `src/app/_layout.tsx` directing unauthenticated users to `(auth)/login` and authenticated users to `(tabs)`.

## 6. Login Screen Interface

- [x] 6.1 Create `src/app/(auth)/login.tsx` styled with strict dark theme (`bg-slate-950`), animated ExpenseFlow logo, tagline, and Google Sign-In button.
- [x] 6.2 Implement visual loading spinner on the button and inline error message banner when authentication fails.

## 7. Verification and Quality Checks

- [x] 7.1 Run strict TypeScript check `npx tsc --noEmit` and verify zero errors across all modified and newly created files.
- [x] 7.2 Run linter `npx expo lint` and verify code style conformity.
