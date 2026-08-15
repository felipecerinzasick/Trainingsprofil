import { DEFAULT_EQUIPMENT_IDS } from "../data/equipment";
import type { BodyRestriction, TrainingProfile } from "../types";

export const STORAGE_KEY = "trainingsprofil-draft-v1";

export const createEmptyProfile = (): TrainingProfile => ({
  schemaVersion: "1.0",
  updatedAt: new Date().toISOString(),
  identity: {
    firstName: "",
    ageGroup: "",
    gender: "",
    heightCm: "",
    weightKg: "",
  },
  goals: {
    primaryGoal: "",
    secondaryGoals: [],
    sports: [],
    motivation: "",
    event: {
      enabled: false,
      type: "",
      name: "",
      date: "",
      distance: "",
      targetTime: "",
    },
  },
  experience: {
    level: "",
    currentTrainingDays: 2,
    trainingHistoryYears: "",
    recentBreak: "",
    currentActivities: [],
    weeklyRunningKm: "",
    longestRunKm: "",
    cyclingHours: "",
    swimmingMeters: "",
    currentRoutine: "",
  },
  schedule: {
    desiredSessions: 3,
    availableDays: [],
    sessionDuration: 45,
    preferredTimes: [],
    planStartDate: "",
    scheduleNotes: "",
  },
  environment: {
    locations: [],
    equipmentIds: [...DEFAULT_EQUIPMENT_IDS],
    equipmentNotes: "",
  },
  health: {
    painFree: null,
    restrictions: [],
    safetyFlags: [],
    safetyConfirmedNone: false,
    conditions: [],
    medicationsNotes: "",
    healthNotes: "",
  },
  preferences: {
    likedStyles: [],
    dislikedStyles: [],
    coachingTone: "balanced",
    variety: 3,
    indoorOutdoor: "balanced",
    excludedExercises: "",
    adherenceBarrier: "",
  },
  recovery: {
    sleepHours: 7,
    sleepQuality: 3,
    stressLevel: 3,
    recoveryFeeling: 3,
    sedentaryHours: "",
  },
  consent: {
    dataProcessing: false,
    healthAcknowledgement: false,
    optionalContact: false,
  },
});

export const loadDraft = (): TrainingProfile | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as TrainingProfile;
  } catch {
    return null;
  }
};

export const saveDraft = (profile: TrainingProfile) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }),
  );
};

export const clearDraft = () => localStorage.removeItem(STORAGE_KEY);

export const createRestriction = (region: string): BodyRestriction => ({
  id: `${region}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  region,
  side: "not_applicable",
  intensity: 3,
  symptoms: ["pain"],
  duration: "",
  triggers: "",
  strategy: "adapt",
  professionalClearance: "not_needed",
  notes: "",
});

export const downloadProfile = (profile: TrainingProfile) => {
  const safeName = profile.identity.firstName.trim().toLowerCase().replace(/[^a-z0-9äöüß-]+/gi, "-") || "profil";
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `trainingsprofil-${safeName}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
