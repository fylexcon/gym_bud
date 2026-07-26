/**
 * GymBud Mobile — Login Screen
 *
 * Minimal auth screen with email/password login.
 * Links to signup and handles Supabase Auth via the API.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing, textStyles, borderRadius, layout } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/v1/auth/login', { email, password });

      // Fetch full user profile
      const profile = await api.get('/api/v1/users/me', {
        params: { user_id: data.user_id },
      });

      setAuth(profile.data.data, data.access_token, data.refresh_token);
    } catch (err: any) {
      Alert.alert('Login Failed', err?.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>GymBud</Text>
        <Text style={styles.subtitle}>Your AI-Powered Fitness Coach</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  form: { padding: spacing['2xl'] },

  title: { ...textStyles.h1, color: colors.primary, textAlign: 'center' },
  subtitle: { ...textStyles.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing['3xl'] },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    height: layout.inputHeight,
    paddingHorizontal: spacing.base,
    color: colors.text,
    fontSize: 15,
    marginBottom: spacing.md,
  },

  button: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.base,
    marginBottom: spacing.xl,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...textStyles.bodyMedium, color: colors.text },

  linkText: { ...textStyles.body, color: colors.textSecondary, textAlign: 'center' },
  linkBold: { color: colors.primary, fontWeight: '600' },
});
