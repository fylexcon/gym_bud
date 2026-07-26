/**
 * GymBud Mobile — Daily Log Service
 *
 * Handles daily meal, sleep, and workout performance logging.
 */

import api from './api';
import { DailyLog, DailySummary, MealEntry } from '../types/fitcheck';
import { ExerciseLog } from '../types/plan';


/**
 * Submit or update a daily log.
 * Uses UPSERT on the backend — safe to call multiple times per day.
 */
export async function submitDailyLog(
  userId: string,
  logData: {
    log_date?: string;
    meals?: MealEntry[];
    water_ml?: number;
    sleep_hours?: number;
    sleep_quality?: string;
    workout_completed?: boolean;
    workout_day_label?: string;
    exercises_logged?: ExerciseLog[];
    session_duration_min?: number;
    overall_rpe?: number;
    energy_level?: string;
    pump_rating?: number;
    mood?: string;
    soreness_level?: string;
    notes?: string;
  },
): Promise<{
  success: boolean;
  log_id: string;
  adaptation_triggered: boolean;
  adaptation_reasons?: string[];
}> {
  const { data } = await api.post('/api/v1/daily-log/log', logData, {
    params: { user_id: userId },
  });
  return data;
}


/**
 * Get recent daily logs.
 */
export async function getRecentLogs(
  userId: string,
  days: number = 7,
): Promise<DailyLog[]> {
  const { data } = await api.get('/api/v1/daily-log/logs', {
    params: { user_id: userId, days },
  });
  return data.data;
}


/**
 * Get a daily summary with actual vs. target macro comparison.
 */
export async function getDailySummary(
  userId: string,
  logDate: string,
): Promise<DailySummary> {
  const { data } = await api.get(`/api/v1/daily-log/summary/${logDate}`, {
    params: { user_id: userId },
  });
  return data;
}
