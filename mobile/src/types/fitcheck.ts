/**
 * GymBud Mobile — Fitcheck & Daily Log Types
 */

export interface FitcheckPhoto {
  id: string;
  user_id: string;
  photo_date: string;
  photo_url: string;
  pose: 'front_relaxed' | 'front_flex' | 'back_relaxed' | 'back_flex' | 'side_left' | 'side_right';
  ai_analysis?: FitcheckAnalysis;
  weight_kg?: number;
  notes?: string;
  created_at: string;
}

export interface FitcheckAnalysis {
  estimated_body_fat_pct?: number;
  muscle_symmetry_score?: number;
  notable_changes: string[];
  areas_to_improve: string[];
  comparison_to_previous: string;
  posing_feedback: string;
  motivation: string;
  recommended_focus: string;
}

export interface MealEntry {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  photo_url?: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;

  // Nutrition
  meals: MealEntry[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  water_ml: number;

  // Sleep
  sleep_hours?: number;
  sleep_quality?: 'poor' | 'fair' | 'good' | 'excellent';

  // Workout
  workout_completed: boolean;
  workout_day_label?: string;
  overall_rpe?: number;
  energy_level?: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  pump_rating?: number;
  mood?: 'poor' | 'average' | 'good' | 'great';

  notes?: string;
  created_at: string;
}

export interface DailySummary {
  log_date: string;
  nutrition: {
    actual: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    target: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    adherence_pct: number;
  };
  workout: {
    completed: boolean;
    rpe?: number;
    energy?: string;
    day_label?: string;
  };
  sleep: {
    hours?: number;
    quality?: string;
  };
  water_ml: number;
}
