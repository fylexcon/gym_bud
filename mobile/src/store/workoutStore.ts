/**
 * GymBud Mobile — Workout Store (Zustand)
 *
 * Holds the active workout plan, current session state,
 * and live set-logging during an active workout.
 */

import { create } from 'zustand';
import { ProgramRecord, WorkoutDay, ExerciseSetLog } from '../types/plan';

interface ActiveSet {
  exerciseIndex: number;
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: number;
  completed: boolean;
}

interface WorkoutState {
  // Active plan
  activePlan: ProgramRecord | null;
  todaysWorkout: WorkoutDay | null;

  // Live session
  isSessionActive: boolean;
  sessionStartedAt: string | null;
  completedSets: ActiveSet[];
  currentExerciseIndex: number;
  restTimerSeconds: number;
  isResting: boolean;

  // Actions — Plan
  setActivePlan: (plan: ProgramRecord) => void;
  setTodaysWorkout: (day: WorkoutDay | null) => void;

  // Actions — Session
  startSession: () => void;
  endSession: () => void;
  logSet: (set: ActiveSet) => void;
  nextExercise: () => void;
  startRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;

  // Reset
  resetWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  // Plan state
  activePlan: null,
  todaysWorkout: null,

  // Session state
  isSessionActive: false,
  sessionStartedAt: null,
  completedSets: [],
  currentExerciseIndex: 0,
  restTimerSeconds: 0,
  isResting: false,

  // Plan actions
  setActivePlan: (plan) => set({ activePlan: plan }),
  setTodaysWorkout: (day) => set({ todaysWorkout: day }),

  // Session actions
  startSession: () =>
    set({
      isSessionActive: true,
      sessionStartedAt: new Date().toISOString(),
      completedSets: [],
      currentExerciseIndex: 0,
    }),

  endSession: () =>
    set({
      isSessionActive: false,
      isResting: false,
      restTimerSeconds: 0,
    }),

  logSet: (newSet) =>
    set((state) => ({
      completedSets: [...state.completedSets, newSet],
    })),

  nextExercise: () =>
    set((state) => ({
      currentExerciseIndex: state.currentExerciseIndex + 1,
    })),

  startRestTimer: (seconds) =>
    set({ isResting: true, restTimerSeconds: seconds }),

  clearRestTimer: () =>
    set({ isResting: false, restTimerSeconds: 0 }),

  resetWorkout: () =>
    set({
      isSessionActive: false,
      sessionStartedAt: null,
      completedSets: [],
      currentExerciseIndex: 0,
      restTimerSeconds: 0,
      isResting: false,
    }),
}));
