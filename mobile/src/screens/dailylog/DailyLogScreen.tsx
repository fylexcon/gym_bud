/**
 * GymBud Mobile — Daily Log Screen
 *
 * Single-page form for logging meals, sleep, workout performance,
 * and subjective feedback. Submits to /api/v1/daily-log/log.
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { colors, spacing, textStyles, borderRadius, layout } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { submitDailyLog } from '../../services/dailyLogService';

export default function DailyLogScreen() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);

  // Form state
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState('good');
  const [waterMl, setWaterMl] = useState('0');
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [rpe, setRpe] = useState('');
  const [energy, setEnergy] = useState('moderate');
  const [mood, setMood] = useState('good');
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    if (!user) return;
    setLoading(true);
    try {
      const result = await submitDailyLog(user.id, {
        sleep_hours: sleepHours ? parseFloat(sleepHours) : undefined,
        sleep_quality: sleepQuality,
        water_ml: parseInt(waterMl) || 0,
        workout_completed: workoutCompleted,
        overall_rpe: rpe ? parseFloat(rpe) : undefined,
        energy_level: energy,
        mood: mood,
        notes: notes || undefined,
      });

      let message = 'Daily log saved!';
      if (result.adaptation_triggered) {
        message += `\n\n⚡ Your plan was adapted: ${result.adaptation_reasons?.join(', ')}`;
      }
      Alert.alert('✅ Logged', message);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to save log');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Daily Log</Text>
      <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

      {/* Sleep Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>😴 Sleep</Text>
        <TextInput style={styles.input} placeholder="Hours slept" placeholderTextColor={colors.textMuted} value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" />
        <View style={styles.chipRow}>
          {['poor', 'fair', 'good', 'excellent'].map((q) => (
            <TouchableOpacity key={q} style={[styles.chip, sleepQuality === q && styles.chipActive]} onPress={() => setSleepQuality(q)}>
              <Text style={[styles.chipText, sleepQuality === q && styles.chipTextActive]}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Water */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💧 Water</Text>
        <TextInput style={styles.input} placeholder="Total water (ml)" placeholderTextColor={colors.textMuted} value={waterMl} onChangeText={setWaterMl} keyboardType="numeric" />
      </View>

      {/* Workout */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏋️ Workout</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Completed today's workout?</Text>
          <Switch value={workoutCompleted} onValueChange={setWorkoutCompleted} trackColor={{ true: colors.primary }} thumbColor={colors.text} />
        </View>
        {workoutCompleted && (
          <>
            <TextInput style={styles.input} placeholder="Session RPE (1-10)" placeholderTextColor={colors.textMuted} value={rpe} onChangeText={setRpe} keyboardType="numeric" />
            <Text style={styles.label}>Energy Level</Text>
            <View style={styles.chipRow}>
              {['very_low', 'low', 'moderate', 'high', 'very_high'].map((e) => (
                <TouchableOpacity key={e} style={[styles.chip, energy === e && styles.chipActive]} onPress={() => setEnergy(e)}>
                  <Text style={[styles.chipText, energy === e && styles.chipTextActive]}>{e.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Mood */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧠 Mood</Text>
        <View style={styles.chipRow}>
          {['poor', 'average', 'good', 'great'].map((m) => (
            <TouchableOpacity key={m} style={[styles.chip, mood === m && styles.chipActive]} onPress={() => setMood(m)}>
              <Text style={[styles.chipText, mood === m && styles.chipTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Notes</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="How did today feel?" placeholderTextColor={colors.textMuted} value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      </View>

      {/* Submit */}
      <TouchableOpacity style={[styles.submitButton, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.submitText}>Save Daily Log ✓</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: spacing['5xl'], paddingTop: spacing['3xl'] },
  title: { ...textStyles.h2, color: colors.text },
  subtitle: { ...textStyles.body, color: colors.textSecondary, marginBottom: spacing.xl },

  section: { marginBottom: spacing.xl },
  sectionTitle: { ...textStyles.h3, color: colors.text, marginBottom: spacing.md },
  label: { ...textStyles.label, color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.sm },

  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md, height: layout.inputHeight,
    paddingHorizontal: spacing.base, color: colors.text, fontSize: 15, marginBottom: spacing.sm,
  },
  textArea: { height: 80, paddingTop: spacing.md, textAlignVertical: 'top' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...textStyles.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.text, fontWeight: '600' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  switchLabel: { ...textStyles.body, color: colors.textSecondary },

  submitButton: {
    backgroundColor: colors.primary, height: layout.buttonHeight, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.base,
  },
  buttonDisabled: { opacity: 0.6 },
  submitText: { ...textStyles.bodyMedium, color: colors.text },
});
