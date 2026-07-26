/**
 * GymBud Mobile — User Types
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;

  // Biometrics
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  height_cm?: number;
  weight_kg?: number;
  body_fat_pct?: number;

  // Fitness profile
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  fitness_goal: 'muscle_gain' | 'fat_loss' | 'recomp' | 'strength' | 'endurance';
  weak_points: string[];
  injuries: string[];
  equipment_access: 'full_gym' | 'home_basic' | 'home_advanced' | 'bodyweight';

  // Onboarding
  onboarding_completed: boolean;
  onboarding_photo_front?: string;
  onboarding_photo_back?: string;
  onboarding_photo_side?: string;

  // Push
  expo_push_token?: string;

  created_at: string;
  updated_at: string;
}

export interface OnboardingData {
  full_name: string;
  email: string;
  gender: string;
  date_of_birth: string;
  height_cm: number;
  weight_kg: number;
  body_fat_pct?: number;
  experience_level: string;
  fitness_goal: string;
  weak_points: string[];
  injuries: string[];
  equipment_access: string;
}
