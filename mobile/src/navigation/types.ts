/**
 * GymBud Mobile — Navigation Type Definitions
 */

import { NavigatorScreenParams } from '@react-navigation/native';

// Auth stack screens
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
};

// Main tab screens
export type MainTabParamList = {
  Dashboard: undefined;
  Workout: NavigatorScreenParams<WorkoutStackParamList>;
  FitcheckTab: NavigatorScreenParams<FitcheckStackParamList>;
  DailyLog: undefined;
  Profile: undefined;
};

// Workout sub-stack
export type WorkoutStackParamList = {
  WorkoutPlan: undefined;
  ActiveWorkout: { dayNumber: number };
  ExerciseDetail: { exerciseName: string };
  WorkoutHistory: undefined;
};

// Fitcheck sub-stack
export type FitcheckStackParamList = {
  FitcheckCamera: undefined;
  FitcheckAlbum: undefined;
  PhotoCompare: undefined;
  Timelapse: undefined;
};

// Root navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
