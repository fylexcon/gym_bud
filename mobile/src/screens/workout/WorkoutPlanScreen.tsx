/**
 * GymBud Mobile — Workout Plan Screen
 *
 * Displays the weekly training split from the active plan.
 * Each day is expandable to show exercises, sets, and techniques.
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, textStyles, borderRadius } from '../../theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { getActivePlan } from '../../services/planService';

export default function WorkoutPlanScreen() {
  const user = useAuthStore((s) => s.user);
  const { activePlan, setActivePlan } = useWorkoutStore();

  useEffect(() => {
    if (user && !activePlan) {
      getActivePlan(user.id).then(setActivePlan).catch(console.log);
    }
  }, [user]);

  const days = activePlan?.plan_json?.days || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your Plan</Text>
      <Text style={styles.subtitle}>{activePlan?.plan_json?.split_type || 'No active plan'}</Text>

      {days.map((day) => (
        <View key={day.day_number} style={styles.dayCard}>
          <Text style={styles.dayLabel}>{day.day_label}</Text>
          <Text style={styles.dayMeta}>
            {day.exercises.length} exercises • ~{day.estimated_duration_min} min
          </Text>
          {day.exercises.map((ex) => (
            <View key={ex.order} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>
                {ex.weak_point_priority ? '⭐ ' : ''}{ex.exercise_name}
              </Text>
              <Text style={styles.exerciseDetail}>
                {ex.sets}×{ex.rep_range} @ RPE {ex.rpe_target} • {ex.technique.replace('_', ' ')}
              </Text>
              {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
            </View>
          ))}
          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.startButtonText}>Start This Day →</Text>
          </TouchableOpacity>
        </View>
      ))}

      {days.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Complete onboarding to generate your plan</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: spacing['5xl'], paddingTop: spacing['3xl'] },
  title: { ...textStyles.h2, color: colors.text },
  subtitle: { ...textStyles.body, color: colors.primary, marginBottom: spacing.xl },

  dayCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.base, marginBottom: spacing.base,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  dayLabel: { ...textStyles.h3, color: colors.text, marginBottom: spacing.xxs },
  dayMeta: { ...textStyles.caption, color: colors.textMuted, marginBottom: spacing.md },

  exerciseRow: { marginBottom: spacing.md, paddingLeft: spacing.sm },
  exerciseName: { ...textStyles.bodyMedium, color: colors.text },
  exerciseDetail: { ...textStyles.caption, color: colors.textSecondary, marginTop: 2 },
  exerciseNotes: { ...textStyles.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },

  startButton: {
    backgroundColor: colors.primaryDark + '30', borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.sm,
  },
  startButtonText: { ...textStyles.bodyMedium, color: colors.primary },

  emptyState: { alignItems: 'center', marginTop: spacing['3xl'] },
  emptyText: { ...textStyles.body, color: colors.textMuted, textAlign: 'center' },
});
