-- ============================================================
-- GymBud: Complete Supabase Database Schema
-- Migration: 001_initial_schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- HELPER: Auto-update `updated_at` trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 1. USERS
-- ============================================================
-- Core user profile storing biometrics, goals, and weak points.
-- `id` matches Supabase Auth's `auth.uid()` for RLS.
-- `weak_points` uses a TEXT[] array so users can flag multiple
-- lagging body parts (e.g., 'lower_chest', 'rear_delts').
-- ============================================================
CREATE TABLE public.users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             TEXT UNIQUE NOT NULL,
  full_name         TEXT NOT NULL,
  avatar_url        TEXT,

  -- Biometrics (captured during onboarding, updatable)
  gender            TEXT CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth     DATE,
  height_cm         NUMERIC(5,1),
  weight_kg         NUMERIC(5,1),
  body_fat_pct      NUMERIC(4,1),

  -- Fitness profile
  experience_level  TEXT NOT NULL DEFAULT 'beginner'
                    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  fitness_goal      TEXT NOT NULL DEFAULT 'muscle_gain'
                    CHECK (fitness_goal IN ('muscle_gain', 'fat_loss', 'recomp', 'strength', 'endurance')),
  weak_points       TEXT[] DEFAULT '{}',
  injuries          TEXT[] DEFAULT '{}',
  equipment_access  TEXT NOT NULL DEFAULT 'full_gym'
                    CHECK (equipment_access IN ('full_gym', 'home_basic', 'home_advanced', 'bodyweight')),

  -- Onboarding physique photos (Supabase Storage paths)
  onboarding_photo_front TEXT,
  onboarding_photo_back  TEXT,
  onboarding_photo_side  TEXT,
  onboarding_completed   BOOLEAN DEFAULT FALSE,

  -- Push notifications
  expo_push_token   TEXT,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Fast lookup by email (login flow)
CREATE INDEX idx_users_email ON public.users(email);


-- ============================================================
-- 2. FITCHECK_PHOTOS
-- ============================================================
-- Daily physique check-in photos. Each row is a single photo
-- (users may upload front, back, side on the same day — one
-- row per pose). `ai_analysis` stores Gemini's visual feedback
-- as JSONB so the schema stays flexible as AI output evolves.
-- ============================================================
CREATE TABLE public.fitcheck_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  photo_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url       TEXT NOT NULL,
  pose            TEXT NOT NULL DEFAULT 'front_relaxed'
                  CHECK (pose IN (
                    'front_relaxed', 'front_flex',
                    'back_relaxed',  'back_flex',
                    'side_left',     'side_right'
                  )),

  -- AI-generated analysis (populated asynchronously after upload)
  ai_analysis     JSONB,
  /*
    Expected shape:
    {
      "estimated_bf_pct": 14.5,
      "muscle_symmetry_score": 7.8,
      "notable_changes": ["visible upper ab definition"],
      "areas_to_improve": ["lower chest fullness"],
      "comparison_to_previous": "Slight improvement in V-taper",
      "posing_feedback": "Keep lighting consistent",
      "motivation": "Great progress this week!",
      "recommended_focus": "Add extra chest volume"
    }
  */

  -- Optional companion data
  weight_kg       NUMERIC(5,1),
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query pattern: "show me all my photos, newest first"
CREATE INDEX idx_fitcheck_user_date ON public.fitcheck_photos(user_id, photo_date DESC);

-- Prevent duplicate poses on the same day
CREATE UNIQUE INDEX idx_fitcheck_unique_pose_per_day
  ON public.fitcheck_photos(user_id, photo_date, pose);


-- ============================================================
-- 3. GENERATED_PROGRAMS
-- ============================================================
-- Stores the full AI-generated training + nutrition plans.
-- `plan_json` and `macro_plan_json` use JSONB because the AI
-- output structure may evolve and we need to query into it
-- (e.g., find all plans where split_type = 'PPL').
-- Only one plan per user is `is_active = TRUE` at a time.
-- ============================================================
CREATE TABLE public.generated_programs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Full workout plan from Gemini
  plan_json       JSONB NOT NULL,
  /*
    Expected shape:
    {
      "split_type": "Push/Pull/Legs (6-day)",
      "mesocycle_weeks": 4,
      "rationale": "...",
      "days": [
        {
          "day_number": 1,
          "day_label": "Push A (Chest Focus)",
          "muscle_groups": ["chest", "front_delts", "triceps"],
          "estimated_duration_min": 65,
          "exercises": [
            {
              "order": 1,
              "exercise_name": "Incline Dumbbell Press",
              "muscle_group": "chest",
              "sets": 4,
              "rep_range": "8-10",
              "rest_seconds": 120,
              "rpe_target": 8,
              "technique": "straight_sets",
              "superset_with": null,
              "notes": "Control the eccentric for 3 seconds",
              "weak_point_priority": true
            }
          ]
        }
      ]
    }
  */

  -- Nutrition plan from Gemini
  macro_plan_json JSONB NOT NULL,
  /*
    Expected shape:
    {
      "daily_calories": 2650,
      "protein_g": 200,
      "carbs_g": 300,
      "fat_g": 75,
      "fiber_g_target": 35,
      "water_liters": 3.5,
      "caloric_strategy": "surplus",
      "rationale": "...",
      "meal_template": [...],
      "supplement_suggestions": [...]
    }
  */

  -- AI's overall analysis of the user at generation time
  analysis_json   JSONB,
  /*
    {
      "visual_assessment": "...",
      "estimated_body_fat_pct": 15,
      "identified_strengths": ["back width", "quad sweep"],
      "identified_weaknesses": ["lower chest", "calves"],
      "agreement_with_user_weak_points": "..."
    }
  */

  -- Coaching metadata from Gemini
  coaching_notes  JSONB,
  /*
    {
      "weekly_focus": "...",
      "progression_model": "...",
      "deload_recommendation": "...",
      "cardio_recommendation": "..."
    }
  */

  version         INT NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  rationale       TEXT,
  
  -- What triggered this generation
  trigger_reason  TEXT DEFAULT 'initial_onboarding'
                  CHECK (trigger_reason IN (
                    'initial_onboarding',
                    'manual_regeneration',
                    'adaptation_performance_drop',
                    'adaptation_plateau',
                    'adaptation_recovery_issue',
                    'weekly_refresh'
                  )),

  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

-- Only one active plan per user (partial unique index)
CREATE UNIQUE INDEX idx_one_active_plan_per_user
  ON public.generated_programs(user_id)
  WHERE is_active = TRUE;

-- Fast lookup: "get my active plan"
CREATE INDEX idx_programs_user_active ON public.generated_programs(user_id, is_active);


-- ============================================================
-- 4. DAILY_LOGS
-- ============================================================
-- Comprehensive daily tracking: nutrition, sleep, workout
-- performance, energy, and hydration. One row per day per user.
-- `meals` uses JSONB to allow flexible meal logging without
-- a separate meals table (keeps queries simple).
-- ============================================================
CREATE TABLE public.daily_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,

  -- ─── NUTRITION ─────────────────────────────────────────
  -- Individual meals stored as JSONB array
  meals           JSONB DEFAULT '[]',
  /*
    [
      {
        "meal_type": "breakfast",
        "description": "Oatmeal with whey protein and banana",
        "calories": 520,
        "protein_g": 35,
        "carbs_g": 72,
        "fat_g": 8,
        "photo_url": null
      },
      ...
    ]
  */

  -- Aggregated daily totals (computed on insert/update or by the app)
  total_calories  INT DEFAULT 0,
  total_protein_g NUMERIC(5,1) DEFAULT 0,
  total_carbs_g   NUMERIC(5,1) DEFAULT 0,
  total_fat_g     NUMERIC(5,1) DEFAULT 0,
  total_fiber_g   NUMERIC(5,1) DEFAULT 0,
  water_ml        INT DEFAULT 0,

  -- ─── SLEEP ─────────────────────────────────────────────
  sleep_hours     NUMERIC(3,1),
  sleep_quality   TEXT CHECK (sleep_quality IN ('poor', 'fair', 'good', 'excellent')),

  -- ─── WORKOUT PERFORMANCE ──────────────────────────────
  workout_completed   BOOLEAN DEFAULT FALSE,
  workout_day_label   TEXT,                   -- e.g. 'Push A (Chest Focus)'

  -- Per-exercise performance
  exercises_logged    JSONB DEFAULT '[]',
  /*
    [
      {
        "exercise_name": "Barbell Bench Press",
        "sets": [
          { "set_number": 1, "reps": 10, "weight_kg": 80, "rpe": 7 },
          { "set_number": 2, "reps": 8,  "weight_kg": 85, "rpe": 8.5 }
        ],
        "technique": "straight_sets",
        "notes": "Felt strong"
      }
    ]
  */

  session_duration_min INT,
  overall_rpe         NUMERIC(3,1) CHECK (overall_rpe BETWEEN 1 AND 10),
  energy_level        TEXT CHECK (energy_level IN ('very_low', 'low', 'moderate', 'high', 'very_high')),
  pump_rating         INT CHECK (pump_rating BETWEEN 1 AND 5),
  mood                TEXT CHECK (mood IN ('poor', 'average', 'good', 'great')),
  soreness_level      TEXT CHECK (soreness_level IN ('none', 'mild', 'moderate', 'severe')),

  -- Free-text notes
  notes               TEXT,

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One log per user per day
CREATE UNIQUE INDEX idx_daily_logs_user_date
  ON public.daily_logs(user_id, log_date);

-- Fast queries for adaptation engine: "last 7 days of logs"
CREATE INDEX idx_daily_logs_user_date_desc
  ON public.daily_logs(user_id, log_date DESC);

-- Auto-update updated_at
CREATE TRIGGER daily_logs_updated_at
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Supabase uses RLS to ensure each user can only read/write
-- their own rows. `auth.uid()` returns the UUID of the
-- currently authenticated user from the JWT.
--
-- HOW IT WORKS:
-- 1. Enable RLS on each table (blocks all access by default).
-- 2. Create policies that allow SELECT/INSERT/UPDATE/DELETE
--    only when the row's `user_id` (or `id` for users table)
--    matches `auth.uid()`.
-- 3. The service_role key bypasses RLS — the FastAPI backend
--    uses this for admin operations (plan generation, etc.).
-- ============================================================

-- Users: users can only manage their own profile row
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_own"
  ON public.users FOR DELETE
  USING (auth.uid() = id);


-- Fitcheck Photos: users can only access their own photos
ALTER TABLE public.fitcheck_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fitcheck_select_own"
  ON public.fitcheck_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "fitcheck_insert_own"
  ON public.fitcheck_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fitcheck_update_own"
  ON public.fitcheck_photos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fitcheck_delete_own"
  ON public.fitcheck_photos FOR DELETE
  USING (auth.uid() = user_id);


-- Generated Programs: users can only read their own programs
-- (inserts/updates are handled by the backend via service_role)
ALTER TABLE public.generated_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programs_select_own"
  ON public.generated_programs FOR SELECT
  USING (auth.uid() = user_id);

-- Backend (service_role) handles INSERT/UPDATE/DELETE for programs
-- No user-facing write policies needed


-- Daily Logs: users manage their own daily entries
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_logs_select_own"
  ON public.daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "daily_logs_insert_own"
  ON public.daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_logs_update_own"
  ON public.daily_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_logs_delete_own"
  ON public.daily_logs FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 6. STORAGE BUCKETS (run via Supabase Dashboard or CLI)
-- ============================================================
-- These are Supabase Storage bucket definitions.
-- Execute via the Supabase Dashboard > Storage > New Bucket
-- or via the Supabase CLI.
--
-- Bucket: onboarding-photos
--   - Private (RLS enforced)
--   - Max file size: 5MB
--   - Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Bucket: fitcheck-photos
--   - Private (RLS enforced)
--   - Max file size: 5MB
--   - Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Bucket: food-photos
--   - Private (RLS enforced)
--   - Max file size: 5MB
--   - Allowed MIME types: image/jpeg, image/png, image/webp
-- ============================================================

-- Storage RLS policies (applied via SQL)
-- Users can only upload to their own folder: {bucket}/{user_id}/filename

-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('onboarding-photos', 'onboarding-photos', FALSE),
--   ('fitcheck-photos',   'fitcheck-photos',   FALSE),
--   ('food-photos',       'food-photos',       FALSE);

-- CREATE POLICY "Users upload own onboarding photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'onboarding-photos'
--     AND auth.uid()::TEXT = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users read own onboarding photos"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'onboarding-photos'
--     AND auth.uid()::TEXT = (storage.foldername(name))[1]
--   );
