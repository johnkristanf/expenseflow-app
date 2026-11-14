# Spec Delta

## Purpose

Provides secure user identity verification, encrypted credential storage, and route access control for ExpenseFlow mobile using native Google Sign-In with Supabase.

## ADDED Requirements

### Requirement: Native Google Sign-In Authentication
The system SHALL authenticate users via native Google Sign-In and exchange the Google identity token with Supabase Auth to establish an authenticated session.

#### Scenario: Successful Google sign-in
- **WHEN** the user initiates Google Sign-In and completes the native credential prompt
- **THEN** the system exchanges the Google ID token with Supabase and establishes an active authenticated session

#### Scenario: Cancelled Google sign-in
- **WHEN** the user dismisses or cancels the native Google Sign-In prompt
- **THEN** the system remains on the login screen in an unauthenticated state without presenting an error alert

#### Scenario: Authentication failure
- **WHEN** Google Sign-In fails due to a network disruption or rejected token
- **THEN** the system displays a descriptive error message on the login screen and preserves the unauthenticated state

### Requirement: Encrypted Session Persistence and Auto-Refresh
The system SHALL persist Supabase authentication credentials securely on the device using encrypted storage and automatically refresh access tokens before expiration.

#### Scenario: Session restoration across app restarts
- **WHEN** the user launches the application with a valid session persisted in secure storage
- **THEN** the system restores the session credentials automatically without requiring re-authentication

#### Scenario: Automatic token renewal
- **WHEN** an authenticated session access token nears expiration
- **THEN** the system uses the persisted refresh token to renew the session seamlessly in the background

### Requirement: Route Protection and Access Control
The system SHALL enforce route protection across the navigation tree, preventing unauthenticated access to personal financial data and application screens.

#### Scenario: Unauthenticated user accesses application
- **WHEN** an unauthenticated user opens the application or attempts to navigate to a protected route
- **THEN** the system redirects the user to the login screen and denies access to financial records

#### Scenario: Authenticated user access
- **WHEN** an authenticated user opens the application or completes sign-in
- **THEN** the system routes the user directly to the protected dashboard tabs

### Requirement: User Sign-Out and Session Revocation
The system SHALL revoke active Supabase sessions, purge stored credentials from secure storage, sign out of the Google SDK, and return the user to the login screen.

#### Scenario: Explicit user sign-out
- **WHEN** an authenticated user triggers sign-out
- **THEN** the system revokes the Supabase session, purges secure storage, signs out of the Google client, and redirects to the login screen

### Requirement: Streamlined Dark-Theme Login Screen
The system SHALL present a dedicated login screen adhering to the strict dark design system (`bg-slate-950`) featuring ExpenseFlow branding and a Google Sign-In button.

#### Scenario: Viewing login interface
- **WHEN** an unauthenticated user views the login screen
- **THEN** the screen displays the dark background (`bg-slate-950`), ExpenseFlow logo, voice-first tagline, and a prominent Google Sign-In action button
