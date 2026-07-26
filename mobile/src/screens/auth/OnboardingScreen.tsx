/**
 * GymBud Mobile — Onboarding Screen
 *
 * Multi-step onboarding wizard:
 *   Step 1: Basic info (gender, DOB, height, weight)
 *   Step 2: Fitness profile (goal, experience, equipment)
 *   Step 3: Weak points selection (multi-select chips)
 *   Step 4: Physique photos (front, back, side)
 *   → Submits everything → triggers AI plan generation
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, textStyles, borderRadius, layout } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const WEAK_POINT_OPTIONS = [
  'upper_chest', 'lower_chest', 'front_delts', 'side_delts', 'rear_delts',
  'upper_back', 'lats', 'lower_back', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'glutes', 'quadriceps', 'hamstrings', 'calves',
];

const GOAL_OPTIONS = [
  { value: 'muscle_gain', label: '💪 Muscle Gain' },
  { value: 'fat_loss', label: '🔥 Fat Loss' },
  { value: 'recomp', label: '⚡ Body Recomp' },
  { value: 'strength', label: '🏋️ Strength' },
  { value: 'endurance', label: '🏃 Endurance' },
];

export default function OnboardingScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [gender, setGender] = useState('male');
  const [dob, setDob] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [goal, setGoal] = useState('muscle_gain');
  const [experience, setExperience] = useState('beginner');
  const [equipment, setEquipment] = useState('full_gym');
  const [weakPoints, setWeakPoints] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ front?: string; back?: string; side?: string }>({});

  function toggleWeakPoint(point: string) {
    setWeakPoints((prev) =>
      prev.includes(point) ? prev.filter((p) => p !== point) : [...prev, point]
    );
  }

  async function pickPhoto(pose: 'front' | 'back' | 'side') {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos((prev) => ({ ...prev, [pose]: result.assets[0].uri }));
    }
  }

  async function handleSubmit() {
    if (!photos.front || !photos.back || !photos.side) {
      Alert.alert('Photos Required', 'Please upload front, back, and side photos');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('user_id', user?.id || '');
      formData.append('full_name', user?.full_name || '');
      formData.append('email', user?.email || '');
      formData.append('gender', gender);
      formData.append('date_of_birth', dob);
      formData.append('height_cm', heightCm);
      formData.append('weight_kg', weightKg);
      formData.append('experience_level', experience);
      formData.append('fitness_goal', goal);
      formData.append('weak_points', JSON.stringify(weakPoints));
      formData.append('injuries', JSON.stringify([]));
      formData.append('equipment_access', equipment);

      // Append photos
      for (const [pose, uri] of Object.entries(photos)) {
        if (uri) {
          const filename = uri.split('/').pop() || `${pose}.jpg`;
          formData.append(`photo_${pose}`, { uri, name: filename, type: 'image/jpeg' } as any);
        }
      }

      await api.post('/api/v1/users/onboarding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      updateUser({ onboarding_completed: true });
      Alert.alert('🎉 Onboarding Complete!', 'Generating your personalized plan...', [
        { text: 'Let\'s Go!' },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.stepIndicator}>Step {step} of 4</Text>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <View>
          <Text style={styles.title}>Basic Info</Text>
          <View style={styles.chipRow}>
            {['male', 'female', 'other'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, gender === g && styles.chipActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="Date of Birth (YYYY-MM-DD)" placeholderTextColor={colors.textMuted} value={dob} onChangeText={setDob} />
          <TextInput style={styles.input} placeholder="Height (cm)" placeholderTextColor={colors.textMuted} value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Weight (kg)" placeholderTextColor={colors.textMuted} value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" />
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(2)}>
            <Text style={styles.nextButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Goals */}
      {step === 2 && (
        <View>
          <Text style={styles.title}>Your Goal</Text>
          {GOAL_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[styles.goalCard, goal === g.value && styles.goalCardActive]}
              onPress={() => setGoal(g.value)}
            >
              <Text style={[styles.goalText, goal === g.value && styles.goalTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
            <Text style={styles.nextButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3: Weak Points */}
      {step === 3 && (
        <View>
          <Text style={styles.title}>Weak Points</Text>
          <Text style={styles.subtitle}>Select areas you want to prioritize</Text>
          <View style={styles.chipRow}>
            {WEAK_POINT_OPTIONS.map((wp) => (
              <TouchableOpacity
                key={wp}
                style={[styles.chip, weakPoints.includes(wp) && styles.chipActive]}
                onPress={() => toggleWeakPoint(wp)}
              >
                <Text style={[styles.chipText, weakPoints.includes(wp) && styles.chipTextActive]}>
                  {wp.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(4)}>
            <Text style={styles.nextButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 4: Photos */}
      {step === 4 && (
        <View>
          <Text style={styles.title}>Physique Photos</Text>
          <Text style={styles.subtitle}>Upload front, back, and side photos for AI analysis</Text>
          <View style={styles.photoRow}>
            {(['front', 'back', 'side'] as const).map((pose) => (
              <TouchableOpacity key={pose} style={styles.photoBox} onPress={() => pickPhoto(pose)}>
                {photos[pose] ? (
                  <Image source={{ uri: photos[pose] }} style={styles.photoImage} />
                ) : (
                  <Text style={styles.photoPlaceholder}>{pose.toUpperCase()}{'\n'}📷 Tap to add</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.submitButtonText}>Complete Onboarding 🚀</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing['2xl'], paddingBottom: spacing['5xl'] },
  stepIndicator: { ...textStyles.label, color: colors.primary, marginBottom: spacing.base },
  title: { ...textStyles.h2, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...textStyles.body, color: colors.textSecondary, marginBottom: spacing.xl },

  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md, height: layout.inputHeight,
    paddingHorizontal: spacing.base, color: colors.text, fontSize: 15, marginBottom: spacing.md,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  chip: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...textStyles.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.text, fontWeight: '600' },

  goalCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.base,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  goalCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryDark + '20' },
  goalText: { ...textStyles.bodyMedium, color: colors.textSecondary, fontSize: 17 },
  goalTextActive: { color: colors.primary },

  photoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  photoBox: {
    width: '30%', aspectRatio: 0.75, backgroundColor: colors.surface,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.surfaceBorder,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { ...textStyles.caption, color: colors.textMuted, textAlign: 'center' },

  nextButton: {
    backgroundColor: colors.primary, height: layout.buttonHeight, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.base,
  },
  nextButtonText: { ...textStyles.bodyMedium, color: colors.text },
  submitButton: {
    backgroundColor: colors.secondary, height: layout.buttonHeight, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { ...textStyles.bodyMedium, color: colors.textInverse },
});
