export type AppView = "landing" | "onboarding" | "complete" | "auth" | "dashboard" | "plan";

export type RestrictionStrategy = "avoid" | "adapt" | "monitor";

export interface EventTarget {
  enabled: boolean;
  type: string;
  name: string;
  date: string;
  distance: string;
  targetTime: string;
}

export interface BodyRestriction {
  id: string;
  region: string;
  side: "left" | "right" | "both" | "not_applicable";
  intensity: number;
  symptoms: string[];
  duration: string;
  triggers: string;
  strategy: RestrictionStrategy;
  professionalClearance: "yes" | "no" | "not_needed";
  notes: string;
}

export interface SafetyFlag {
  id: string;
  value: boolean;
}

export interface TrainingProfile {
  schemaVersion: "1.0";
  updatedAt: string;
  identity: {
    firstName: string;
    ageGroup: string;
    gender: string;
    heightCm: string;
    weightKg: string;
  };
  goals: {
    primaryGoal: string;
    secondaryGoals: string[];
    sports: string[];
    motivation: string;
    event: EventTarget;
  };
  experience: {
    level: string;
    currentTrainingDays: number;
    trainingHistoryYears: string;
    recentBreak: string;
    currentActivities: string[];
    weeklyRunningKm: string;
    longestRunKm: string;
    cyclingHours: string;
    swimmingMeters: string;
    currentRoutine: string;
  };
  schedule: {
    desiredSessions: number;
    availableDays: string[];
    sessionDuration: number;
    preferredTimes: string[];
    planStartDate: string;
    scheduleNotes: string;
  };
  environment: {
    locations: string[];
    equipmentIds: string[];
    equipmentNotes: string;
  };
  health: {
    painFree: boolean | null;
    restrictions: BodyRestriction[];
    safetyFlags: SafetyFlag[];
    safetyConfirmedNone: boolean;
    conditions: string[];
    medicationsNotes: string;
    healthNotes: string;
  };
  preferences: {
    likedStyles: string[];
    dislikedStyles: string[];
    coachingTone: string;
    variety: number;
    indoorOutdoor: string;
    excludedExercises: string;
    adherenceBarrier: string;
  };
  recovery: {
    sleepHours: number;
    sleepQuality: number;
    stressLevel: number;
    recoveryFeeling: number;
    sedentaryHours: string;
  };
  consent: {
    dataProcessing: boolean;
    healthAcknowledgement: boolean;
    optionalContact: boolean;
  };
}
