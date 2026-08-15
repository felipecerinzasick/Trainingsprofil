import type { TrainingProfile } from "../types";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: "bearer";
  user: AuthUser;
}

export interface PlanListItem {
  id: string;
  title: string;
  goalLabel: string;
  sportFocus: string;
  status: string;
  safetyStatus: string;
  startDate: string;
  endDate: string;
  durationWeeks: number;
  createdAt: string;
}

export interface PlanIntensity {
  rpe?: string;
  zone?: string;
  talkTest?: string;
}

export interface PlanAlternative {
  exerciseId?: string | null;
  name: string;
}

export interface PlanExercise {
  exerciseId?: string | null;
  name: string;
  pattern?: string;
  primaryMuscle?: string;
  equipment?: string[];
  sets?: number;
  reps?: string;
  restSeconds?: number;
  tempo?: string;
  targetRpe?: string;
  progression?: string;
  notes?: string[];
  alternatives?: PlanAlternative[];
}

export interface EnduranceItem {
  title: string;
  dose?: string;
  intensity?: string;
  details?: string;
}

export interface PlanBlock {
  type: string;
  title: string;
  instructions?: string;
  exercises?: PlanExercise[];
  items?: EnduranceItem[];
}

export interface PlanSession {
  id: string;
  date: string;
  weekday: string;
  preferredTime?: string;
  type: string;
  discipline: string;
  title: string;
  subtitle?: string;
  durationMinutes: number;
  intensity: PlanIntensity;
  objective: string;
  warmup?: Array<{ title: string; details?: string; durationMinutes?: number }>;
  blocks: PlanBlock[];
  cooldown?: Array<{ title: string; details?: string; durationMinutes?: number }>;
  equipment?: string[];
  adaptations?: string[];
  coachNote?: string;
  loadFactor?: number;
}

export interface PlanWeek {
  weekNumber: number;
  theme: string;
  coachNote: string;
  loadFactor: number;
  targetMinutes: number;
  sessions: PlanSession[];
  recoveryGuidance: string;
}

export interface TrainingPlan {
  schemaVersion: string;
  engineVersion: string;
  id: string;
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
  startsOn: string;
  endsOn: string;
  durationWeeks: number;
  sessionsPerWeek: number;
  goalType: string;
  discipline: string;
  phase: string;
  athleteSnapshot: {
    firstName: string;
    ageGroup: string;
    goal: string;
    sports: string[];
    experience: string;
    currentTrainingDays: number;
    event: null | { name: string; date: string; distance: string; target: string };
    equipmentSummary: string[];
    restrictionSummary: string[];
  };
  safety: {
    status: string;
    generationAllowed: boolean;
    notices: string[];
    disclaimer: string;
  };
  principles: string[];
  planNotes: string[];
  weeks: PlanWeek[];
  progressionNotes: string[];
  qualityChecks: Record<string, string | number | boolean | null>;
}

export interface PlanRecord extends PlanListItem {
  plan: TrainingPlan;
  profileSnapshot: TrainingProfile;
}

export interface ApiProblem {
  status: number;
  message: string;
  code?: string;
  notices?: string[];
}
