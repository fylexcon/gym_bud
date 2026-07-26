/**
 * GymBud Mobile — Plan & Workout Types
 */

export interface ExerciseInstruction {
  order: number;
  exercise_name: string;
  muscle_group: string;
  sets: number;
  rep_range: string;
  rest_seconds: number;
  rpe_target: number;
  technique: 'straight_sets' | 'superset' | 'pre_exhaustion' | 'drop_set' | 'myo_reps' | 'pause_reps';
  superset_with?: string | null;
  notes: string;
  weak_point_priority: boolean;
}

export interface WorkoutDay {
  day_number: number;
  day_label: string;
  muscle_groups: string[];
  estimated_duration_min: number;
  exercises: ExerciseInstruction[];
}

export interface NutritionMeal {
  meal_number: number;
  meal_name: string;
  timing: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  example_foods: string[];
}

export interface GeneratedPlan {
  // Analysis
  analysis_summary: string;
  estimated_body_fat_pct?: number;
  identified_strengths: string[];
  identified_weaknesses: string[];
  agreement_with_weak_points: string;

  // Training
  split_type: string;
  mesocycle_weeks: number;
  rationale: string;
  days: WorkoutDay[];

  // Nutrition
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g_target: number;
  water_liters: number;
  caloric_strategy: 'surplus' | 'deficit' | 'maintenance';
  nutrition_rationale: string;
  meal_template: NutritionMeal[];

  // Coaching
  weekly_focus: string;
  progression_model: string;
  deload_recommendation: string;
  cardio_recommendation: string;
}

export interface ProgramRecord {
  id: string;
  user_id: string;
  plan_json: {
    split_type: string;
    mesocycle_weeks: number;
    rationale: string;
    days: WorkoutDay[];
  };
  macro_plan_json: {
    daily_calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    caloric_strategy: string;
    meal_template: NutritionMeal[];
  };
  coaching_notes: {
    weekly_focus: string;
    progression_model: string;
    deload_recommendation: string;
    cardio_recommendation: string;
  };
  version: number;
  is_active: boolean;
  generated_at: string;
}

export interface ExerciseSetLog {
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe?: number;
}

export interface ExerciseLog {
  exercise_name: string;
  sets: ExerciseSetLog[];
  technique: string;
  notes?: string;
}
