/**
 * GymBud Mobile — Dashboard Screen
 *
 * The home screen showing:
 * - Today's workout at a glance
 * - Macro progress rings (protein/carbs/fat)
 * - Daily streak indicator
 * - Quick action buttons
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { colors, spacing, textStyles, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { getActivePlan } from '../../services/planService';
import { getDailySummary } from '../../services/dailyLogService';

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const { activePlan, setActivePlan } = useWorkoutStore();
  const [refreshing, setRefreshing] = useState(false);
  const [dailySummary, setDailySummary] = useState<any>(null);

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    if (!user) return;
    try {
      const plan = await getActivePlan(user.id);
      setActivePlan(plan);

      const summary = await getDailySummary(user.id, today);
      setDailySummary(summary);
    } catch (err) {
      // First time users won't have a plan yet
      console.log('Dashboard data load:', err);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }

  // Get today's workout from the active plan
  const todaysWorkout = activePlan?.plan_json?.days?.find(
    (d) => d.day_number === (dayOfWeek === 0 ? 7 : dayOfWeek)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hey, {user?.full_name?.split(' ')[0] || 'Athlete'} 💪
        </Text>
        <Text style={styles.subtitle}>Let's crush it today</Text>
      </View>

      {/* Today's Workout Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>TODAY'S WORKOUT</Text>
        {todaysWorkout ? (
          <>
            <Text style={styles.cardTitle}>{todaysWorkout.day_label}</Text>
            <Text style={styles.cardMeta}>
              {todaysWorkout.exercises.length} exercises • ~{todaysWorkout.estimated_duration_min} min
            </Text>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Start Workout →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.cardMeta}>Rest day — recover and come back stronger</Text>
        )}
      </View>

      {/* Macro Progress */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>DAILY MACROS</Text>
        {dailySummary?.nutrition ? (
          <View style={styles.macroRow}>
            <MacroRing
              label="Protein"
              actual={dailySummary.nutrition.actual.protein_g}
              target={dailySummary.nutrition.target.protein_g}
              color={colors.protein}
            />
            <MacroRing
              label="Carbs"
              actual={dailySummary.nutrition.actual.carbs_g}
              target={dailySummary.nutrition.target.carbs_g}
              color={colors.carbs}
            />
            <MacroRing
              label="Fat"
              actual={dailySummary.nutrition.actual.fat_g}
              target={dailySummary.nutrition.target.fat_g}
              color={colors.fat}
            />
          </View>
        ) : (
          <Text style={styles.cardMeta}>Log your first meal to see progress</Text>
        )}
      </View>

      {/* Coaching Focus */}
      {activePlan?.coaching_notes && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>THIS WEEK'S FOCUS</Text>
          <Text style={styles.coachingText}>{activePlan.coaching_notes.weekly_focus}</Text>
        </View>
      )}
    </ScrollView>
  );
}

// Simple macro ring component (placeholder — replace with SVG circles)
function MacroRing({ label, actual, target, color }: {
  label: string; actual: number; target: number; color: string;
}) {
  const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
  return (
    <View style={styles.macroItem}>
      <View style={[styles.macroCircle, { borderColor: color }]}>
        <Text style={[styles.macroValue, { color }]}>{pct}%</Text>
      </View>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroDetail}>{actual}g / {target}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: spacing['5xl'] },

  header: { marginBottom: spacing.xl, marginTop: spacing['2xl'] },
  greeting: { ...textStyles.h2, color: colors.text },
  subtitle: { ...textStyles.body, color: colors.textSecondary, marginTop: spacing.xs },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardLabel: { ...textStyles.label, color: colors.textMuted, marginBottom: spacing.sm },
  cardTitle: { ...textStyles.h3, color: colors.text, marginBottom: spacing.xs },
  cardMeta: { ...textStyles.body, color: colors.textSecondary },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.base,
  },
  primaryButtonText: { ...textStyles.bodyMedium, color: colors.text },

  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.sm },
  macroItem: { alignItems: 'center' },
  macroCircle: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center',
  },
  macroValue: { ...textStyles.bodyMedium, fontSize: 16 },
  macroLabel: { ...textStyles.caption, color: colors.textSecondary, marginTop: spacing.xs },
  macroDetail: { ...textStyles.caption, color: colors.textMuted, fontSize: 10 },

  coachingText: { ...textStyles.body, color: colors.secondary, fontStyle: 'italic' },
});
