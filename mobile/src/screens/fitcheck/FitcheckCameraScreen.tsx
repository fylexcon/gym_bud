/**
 * GymBud Mobile — Fitcheck Camera Screen
 *
 * Guided photo capture with pose overlay, plus AI analysis display.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing, textStyles, borderRadius, layout } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { capturePhysiquePhoto, pickPhotoFromGallery, uploadFitcheckPhoto } from '../../services/fitcheckService';
import { FitcheckAnalysis } from '../../types/fitcheck';

const POSES = ['front_relaxed', 'front_flex', 'back_relaxed', 'back_flex', 'side_left', 'side_right'] as const;

export default function FitcheckCameraScreen() {
  const user = useAuthStore((s) => s.user);
  const [selectedPose, setSelectedPose] = useState<string>('front_relaxed');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<FitcheckAnalysis | null>(null);

  async function handleCapture() {
    try {
      const uri = await capturePhysiquePhoto();
      if (uri) setCapturedUri(uri);
    } catch (err: any) {
      Alert.alert('Camera Error', err.message);
    }
  }

  async function handlePick() {
    try {
      const uri = await pickPhotoFromGallery();
      if (uri) setCapturedUri(uri);
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message);
    }
  }

  async function handleUpload() {
    if (!capturedUri || !user) return;
    setUploading(true);
    try {
      const result = await uploadFitcheckPhoto(user.id, capturedUri, selectedPose);
      setAnalysis(result.ai_analysis);
      Alert.alert('✅ Fitcheck Uploaded!', 'AI analysis is ready.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Fitcheck 📸</Text>

      {/* Pose Selector */}
      <View style={styles.poseRow}>
        {POSES.map((pose) => (
          <TouchableOpacity
            key={pose}
            style={[styles.poseChip, selectedPose === pose && styles.poseChipActive]}
            onPress={() => setSelectedPose(pose)}
          >
            <Text style={[styles.poseText, selectedPose === pose && styles.poseTextActive]}>
              {pose.replace('_', '\n')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Photo Preview */}
      <View style={styles.photoPreview}>
        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />
        ) : (
          <Text style={styles.previewPlaceholder}>Take or select a photo</Text>
        )}
      </View>

      {/* Capture Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <Text style={styles.captureButtonText}>📷 Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryButton} onPress={handlePick}>
          <Text style={styles.galleryButtonText}>🖼 Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Upload */}
      {capturedUri && (
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.buttonDisabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.uploadButtonText}>Upload & Analyze ✨</Text>
          )}
        </TouchableOpacity>
      )}

      {/* AI Analysis Result */}
      {analysis && (
        <View style={styles.analysisCard}>
          <Text style={styles.analysisTitle}>AI Analysis</Text>
          <Text style={styles.analysisText}>💪 {analysis.motivation}</Text>
          {analysis.notable_changes.length > 0 && (
            <Text style={styles.analysisText}>
              📈 Changes: {analysis.notable_changes.join(', ')}
            </Text>
          )}
          {analysis.recommended_focus && (
            <Text style={styles.analysisText}>🎯 Focus: {analysis.recommended_focus}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.base, paddingTop: spacing['3xl'] },
  title: { ...textStyles.h2, color: colors.text, marginBottom: spacing.base },

  poseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.base },
  poseChip: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    backgroundColor: colors.surface, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  poseChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  poseText: { ...textStyles.caption, color: colors.textMuted, textAlign: 'center', fontSize: 10 },
  poseTextActive: { color: colors.text },

  photoPreview: {
    height: 300, backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.base,
    borderWidth: 1, borderColor: colors.surfaceBorder, overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  previewPlaceholder: { ...textStyles.body, color: colors.textMuted },

  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  captureButton: {
    flex: 1, backgroundColor: colors.surface, height: layout.buttonHeight,
    borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  captureButtonText: { ...textStyles.bodyMedium, color: colors.text },
  galleryButton: {
    flex: 1, backgroundColor: colors.surface, height: layout.buttonHeight,
    borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  galleryButtonText: { ...textStyles.bodyMedium, color: colors.text },

  uploadButton: {
    backgroundColor: colors.secondary, height: layout.buttonHeight,
    borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.base,
  },
  buttonDisabled: { opacity: 0.6 },
  uploadButtonText: { ...textStyles.bodyMedium, color: colors.textInverse },

  analysisCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.base, borderWidth: 1, borderColor: colors.primary + '40',
  },
  analysisTitle: { ...textStyles.h3, color: colors.primary, marginBottom: spacing.sm },
  analysisText: { ...textStyles.body, color: colors.textSecondary, marginBottom: spacing.xs },
});
