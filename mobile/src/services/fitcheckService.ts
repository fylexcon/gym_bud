/**
 * GymBud Mobile — Fitcheck Service
 *
 * Handles the complete photo upload flow:
 *   1. Pick/capture image using expo-image-picker
 *   2. Build FormData with the image + metadata
 *   3. POST to /api/v1/fitcheck/upload
 *   4. Return the AI analysis result
 *
 * Also provides album retrieval and progress comparison endpoints.
 */

import * as ImagePicker from 'expo-image-picker';
import api from './api';
import { FitcheckPhoto, FitcheckAnalysis } from '../types/fitcheck';


// ──────────────────────────────────────────────
// Image Capture & Upload
// ──────────────────────────────────────────────

/**
 * Launch the camera to capture a physique photo.
 * Returns the local URI of the captured image, or null if cancelled.
 */
export async function capturePhysiquePhoto(): Promise<string | null> {
  // Request camera permission
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Camera permission is required to take fitcheck photos.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,          // Good quality while keeping size reasonable
    allowsEditing: false,  // No cropping — we need the full physique
    aspect: [3, 4],        // Portrait orientation
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Pick a photo from the device's gallery.
 */
export async function pickPhotoFromGallery(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Photo library permission is required.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Upload a fitcheck photo to the backend.
 *
 * This builds a FormData payload and sends it as multipart/form-data
 * to the FastAPI /api/v1/fitcheck/upload endpoint. The backend then:
 *   1. Stores the photo in Supabase Storage
 *   2. Sends it to Gemini for AI analysis
 *   3. Returns the analysis result
 *
 * @param userId    - Current user's UUID
 * @param imageUri  - Local file URI from camera/picker
 * @param pose      - Which pose this photo is (front_relaxed, back_flex, etc.)
 * @param weightKg  - Optional weigh-in alongside the photo
 * @param notes     - Optional free-text notes
 */
export async function uploadFitcheckPhoto(
  userId: string,
  imageUri: string,
  pose: string = 'front_relaxed',
  weightKg?: number,
  notes?: string,
): Promise<{
  success: boolean;
  photo_id: string;
  photo_url: string;
  ai_analysis: FitcheckAnalysis;
}> {
  // Build FormData for multipart upload
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('pose', pose);

  if (weightKg !== undefined) {
    formData.append('weight_kg', weightKg.toString());
  }
  if (notes) {
    formData.append('notes', notes);
  }

  // Append the image file
  // React Native requires this specific format for FormData image uploads
  const filename = imageUri.split('/').pop() || 'fitcheck.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('photo', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as any);

  // Send to backend (override Content-Type for multipart)
  const { data } = await api.post('/api/v1/fitcheck/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60s timeout — AI analysis takes time
  });

  return data;
}


// ──────────────────────────────────────────────
// Album & History
// ──────────────────────────────────────────────

/**
 * Get the user's fitcheck photo album (paginated, newest first).
 */
export async function getFitcheckAlbum(
  userId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<{
  photos: FitcheckPhoto[];
  total_count: number;
  page: number;
  page_size: number;
}> {
  const { data } = await api.get('/api/v1/fitcheck/album', {
    params: { user_id: userId, page, page_size: pageSize },
  });
  return data;
}

/**
 * Get a specific fitcheck photo with its AI analysis.
 */
export async function getFitcheckDetail(
  photoId: string,
  userId: string,
): Promise<FitcheckPhoto> {
  const { data } = await api.get(`/api/v1/fitcheck/album/${photoId}`, {
    params: { user_id: userId },
  });
  return data.data;
}

/**
 * Get before/after progress comparison (first vs. latest fitcheck).
 */
export async function getProgressComparison(userId: string): Promise<{
  first: FitcheckPhoto | null;
  latest: FitcheckPhoto | null;
}> {
  const { data } = await api.get('/api/v1/fitcheck/progress', {
    params: { user_id: userId },
  });
  return data;
}

/**
 * Get all photos for a specific pose in chronological order
 * (for timelapse rendering on the client).
 */
export async function getTimelapsePhotos(
  userId: string,
  pose: string = 'front_relaxed',
): Promise<{ photo_date: string; photo_url: string; weight_kg?: number }[]> {
  const { data } = await api.get('/api/v1/fitcheck/timelapse', {
    params: { user_id: userId, pose },
  });
  return data.photos;
}
