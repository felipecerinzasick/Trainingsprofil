export interface SelectOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

export const PRIMARY_GOALS: SelectOption[] = [
  { id: "healthy_strength", label: "Stark und gesund bleiben", description: "Alltagskraft, Stabilität und langfristige Belastbarkeit", icon: "heart" },
  { id: "strength_muscle", label: "Kraft und Muskeln aufbauen", description: "Progressiv stärker werden und Muskulatur entwickeln", icon: "dumbbell" },
  { id: "endurance", label: "Ausdauer verbessern", description: "Länger, effizienter und mit besserem Gefühl trainieren", icon: "pulse" },
  { id: "event", label: "Auf ein Ziel vorbereiten", description: "Marathon, Triathlon, Trailrun oder ein anderes Event", icon: "flag" },
  { id: "mobility", label: "Beweglicher und belastbarer werden", description: "Mobilität, Kontrolle und Wohlbefinden verbessern", icon: "mobility" },
  { id: "return", label: "Wieder einsteigen", description: "Nach Pause oder längerer Inaktivität sicher Routine aufbauen", icon: "refresh" },
  { id: "weight", label: "Körpergewicht regulieren", description: "Bewegung, Kraft und Ausdauer nachhaltig kombinieren", icon: "scale" },
];

export const SPORTS: SelectOption[] = [
  { id: "strength", label: "Krafttraining", icon: "dumbbell" },
  { id: "running", label: "Laufen", icon: "run" },
  { id: "trail", label: "Trailrunning", icon: "mountain" },
  { id: "cycling", label: "Radfahren", icon: "bike" },
  { id: "swimming", label: "Schwimmen", icon: "swim" },
  { id: "triathlon", label: "Triathlon", icon: "triathlon" },
  { id: "hiking", label: "Wandern", icon: "steps" },
  { id: "mobility", label: "Mobilität", icon: "mobility" },
  { id: "other", label: "Andere Aktivität", icon: "plus" },
];

export const EXPERIENCE_LEVELS: SelectOption[] = [
  { id: "new", label: "Ich beginne gerade", description: "Wenig oder keine regelmässige Trainingserfahrung" },
  { id: "returning", label: "Ich steige wieder ein", description: "Erfahrung vorhanden, aktuell aber aus der Routine" },
  { id: "regular", label: "Ich trainiere regelmässig", description: "Seit mindestens einigen Monaten konstant aktiv" },
  { id: "experienced", label: "Ich bin erfahren", description: "Mehrjährige strukturierte Trainingserfahrung" },
];

export const AGE_GROUPS = ["Unter 18", "18–29", "30–39", "40–49", "50–59", "60–69", "70+"];
export const GENDERS = ["Weiblich", "Männlich", "Divers", "Keine Angabe"];

export const WEEKDAYS = [
  { id: "mon", short: "Mo", label: "Montag" },
  { id: "tue", short: "Di", label: "Dienstag" },
  { id: "wed", short: "Mi", label: "Mittwoch" },
  { id: "thu", short: "Do", label: "Donnerstag" },
  { id: "fri", short: "Fr", label: "Freitag" },
  { id: "sat", short: "Sa", label: "Samstag" },
  { id: "sun", short: "So", label: "Sonntag" },
];

export const PREFERRED_TIMES = [
  { id: "morning", label: "Morgens" },
  { id: "midday", label: "Mittags" },
  { id: "evening", label: "Abends" },
  { id: "flexible", label: "Flexibel" },
];

export const TRAINING_LOCATIONS: SelectOption[] = [
  { id: "home", label: "Zu Hause", description: "Wohnung, Keller oder Home-Gym", icon: "home" },
  { id: "gym", label: "Fitnessstudio", description: "Geräte, freie Gewichte oder Kurse", icon: "building" },
  { id: "outdoor", label: "Draussen", description: "Strasse, Park, Wald oder Berge", icon: "sun" },
  { id: "pool", label: "Schwimmbad", description: "Regelmässiger Zugang zu einem Becken", icon: "swim" },
];

export const BODY_REGIONS: SelectOption[] = [
  { id: "neck", label: "Nacken" },
  { id: "shoulder", label: "Schulter" },
  { id: "upper_arm", label: "Oberarm / Ellenbogen" },
  { id: "forearm_wrist", label: "Unterarm / Handgelenk" },
  { id: "chest", label: "Brustkorb" },
  { id: "upper_back", label: "Oberer Rücken" },
  { id: "lower_back", label: "Unterer Rücken" },
  { id: "hip_groin", label: "Hüfte / Leiste" },
  { id: "thigh", label: "Oberschenkel" },
  { id: "knee", label: "Knie" },
  { id: "lower_leg", label: "Unterschenkel / Wade" },
  { id: "ankle_foot", label: "Sprunggelenk / Fuss" },
];

export const SYMPTOMS = [
  { id: "pain", label: "Schmerz" },
  { id: "stiffness", label: "Steifheit" },
  { id: "instability", label: "Instabilität" },
  { id: "weakness", label: "Kraftverlust" },
  { id: "numbness", label: "Taubheit / Kribbeln" },
];

export const SAFETY_QUESTIONS: SelectOption[] = [
  { id: "chest_symptoms", label: "Brustschmerz oder ungewöhnliche Atemnot bei Belastung" },
  { id: "dizziness", label: "Schwindel, Ohnmacht oder ungeklärte Gleichgewichtsprobleme" },
  { id: "cardio_condition", label: "Bekannte Herz-Kreislauf-Erkrankung oder nicht eingestellter Blutdruck" },
  { id: "recent_surgery", label: "Kürzliche Operation, akute Verletzung oder ärztliche Trainingspause" },
  { id: "pregnancy", label: "Schwangerschaft oder frühe Phase nach der Geburt" },
  { id: "neurological", label: "Neurologische Symptome, Lähmung oder zunehmende Taubheit" },
];

export const CONDITIONS = [
  "Arthrose / Gelenkbeschwerden",
  "Osteoporose / geringe Knochendichte",
  "Diabetes / Stoffwechselerkrankung",
  "Asthma / Atemwegserkrankung",
  "Herz-Kreislauf-Erkrankung",
  "Neurologische Erkrankung",
  "Keine bekannte Erkrankung",
];

export const TRAINING_STYLES: SelectOption[] = [
  { id: "free_weights", label: "Freie Gewichte", icon: "dumbbell" },
  { id: "machines", label: "Maschinen", icon: "settings" },
  { id: "bodyweight", label: "Körpergewicht", icon: "user" },
  { id: "steady_cardio", label: "Ruhige Ausdauer", icon: "pulse" },
  { id: "intervals", label: "Intervalle", icon: "bolt" },
  { id: "circuits", label: "Zirkel", icon: "refresh" },
  { id: "mobility", label: "Mobilität", icon: "mobility" },
  { id: "outdoor", label: "Outdoor-Einheiten", icon: "sun" },
];

export const BARRIERS = [
  "Zeitmangel",
  "Unregelmässiger Alltag",
  "Motivationsschwankungen",
  "Schmerzen oder Unsicherheit",
  "Zu anspruchsvolle Pläne",
  "Lange Anfahrt zum Training",
  "Keine besondere Hürde",
];
