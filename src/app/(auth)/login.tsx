import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { statusCodes } from '@/lib/google-auth';

const logoKeyframe = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 16 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
});

const contentKeyframe = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 24 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
});

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signIn();
    } catch (err: unknown) {
    console.log('Sign-in error:', err);
      const code = (err as { code?: string })?.code;
      // User cancelled — silent dismiss, no error shown
      if (
        code === statusCodes.SIGN_IN_CANCELLED ||
        code === statusCodes.IN_PROGRESS
      ) {
        setLoading(false);
        return;
      }
      setError('Sign-in failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Logo */}
      <Animated.View entering={logoKeyframe.duration(500)} style={styles.logoWrap}>
        <View style={styles.logoBackground}>
          <Image
            style={styles.logoImage}
            source={require('@/assets/images/expenseflow-icon.png')}
            contentFit="contain"
          />
        </View>
      </Animated.View>

      {/* Hero text */}
      <Animated.View entering={contentKeyframe.duration(500).delay(120)} style={styles.heroWrap}>
        <Text style={styles.appName}>ExpenseFlow</Text>
        <Text style={styles.tagline}>Track every peso,{'\n'}by voice.</Text>
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={contentKeyframe.duration(500).delay(240)} style={styles.ctaWrap}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]}
          onPress={handleSignIn}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google">
          {loading ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <>
              <Image
                style={styles.googleLogo}
                source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                contentFit="contain"
              />
              <Text style={styles.googleBtnText}>Sign in with Google</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.legalText}>
          By signing in you agree to our Terms of Service and Privacy Policy.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 48,
  },
  logoWrap: {
    alignItems: 'center',
  },
  logoBackground: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#0ea5e9', // sky-500 brand blue
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle glow
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  heroWrap: {
    gap: 12,
  },
  appName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#22d3ee', // cyan-400
    textAlign: 'center',
  },
  tagline: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  ctaWrap: {
    gap: 16,
  },
  errorBanner: {
    backgroundColor: '#1e1b1b',
    borderWidth: 1,
    borderColor: '#f43f5e', // rose-500
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 14,
    lineHeight: 20,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 52,
    // Minimum 44pt touch — 52px exceeds this
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  googleBtnPressed: {
    opacity: 0.88,
  },
  googleLogo: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.1,
  },
  legalText: {
    fontSize: 12,
    color: '#475569', // slate-600
    textAlign: 'center',
    lineHeight: 18,
  },
});
