/**
 * GymBud Mobile — Plan Service
 *
 * Handles plan generation, retrieval, and adaptation triggers.
 */

import api from './api';
import { ProgramRecord, GeneratedPlan } from '../types/plan';


/**
 * Trigger AI plan generation via Gemini 1.5 Flash.
 * This is the core endpoint — may take 10-20 seconds.
 */
export async function generateProgram(
  userId: string,
  adaptationContext?: Record<string, any>,
): Promise<{
  success: boolean;
  program_id: string;
  version: number;
  plan: GeneratedPlan;
}> {
  const { data } = await api.post('/api/v1/plans/generate', {
    user_id: userId,
    adaptation_context: adaptationContext || null,
  }, {
    timeout: 60000, // 60s — Gemini can take a while
  });
  return data;
}


/**
 * Get the user's currently active plan.
 */
export async function getActivePlan(userId: string): Promise<ProgramRecord> {
  const { data } = await api.get('/api/v1/plans/active', {
    params: { user_id: userId },
  });
  return data.data;
}


/**
 * Get plan version history.
 */
export async function getPlanHistory(
  userId: string,
  limit: number = 10,
): Promise<{ id: string; version: number; is_active: boolean; generated_at: string }[]> {
  const { data } = await api.get('/api/v1/plans/history', {
    params: { user_id: userId, limit },
  });
  return data.data;
}


/**
 * Manually trigger the adaptation engine.
 */
export async function triggerAdaptation(userId: string): Promise<{
  adapted: boolean;
  message: string;
  plan?: GeneratedPlan;
}> {
  const { data } = await api.post('/api/v1/plans/adapt', null, {
    params: { user_id: userId },
    timeout: 60000,
  });
  return data;
}
