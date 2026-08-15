import type { Dispatch, SetStateAction } from "react";
import type { TrainingProfile } from "../../types";

export type UpdateSection = <K extends keyof TrainingProfile>(
  section: K,
  patch: Partial<TrainingProfile[K]>,
) => void;

export interface StepProps {
  profile: TrainingProfile;
  updateSection: UpdateSection;
  setProfile: Dispatch<SetStateAction<TrainingProfile>>;
}

export function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
