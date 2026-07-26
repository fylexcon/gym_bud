/**
 * GymBud Mobile — Signup Screen
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing, textStyles, borderRadius, layout } from '../../theme';
import api from '../../services/api';

export default function SignupScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/v1/auth/signup', {
        email,
        password,
        full_name: fullName,
      });

      Alert.alert('Account Created!', 'Please log in with your credentials.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      Alert.alert('Signup Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your transformation journey</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />
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
          placeholder="Password (6+ characters)"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkBold}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  form: { padding: spacing['2xl'] },
  title: { ...textStyles.h2, color: colors.text, textAlign: 'center' },
  subtitle: { ...textStyles.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing['3xl'] },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md, height: layout.inputHeight,
    paddingHorizontal: spacing.base, color: colors.text, fontSize: 15, marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary, height: layout.buttonHeight, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.base, marginBottom: spacing.xl,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...textStyles.bodyMedium, color: colors.text },
  linkText: { ...textStyles.body, color: colors.textSecondary, textAlign: 'center' },
  linkBold: { color: colors.primary, fontWeight: '600' },
});
