export interface EquipmentOption {
  id: string;
  label: string;
  group: string;
  category: string;
  defaultAvailable: boolean;
  fullGym: boolean;
  implies: string[];
}

export interface EquipmentPreset {
  id: string;
  label: string;
  description: string;
  equipmentIds: string[];
}

export const EQUIPMENT: EquipmentOption[] = [
  {
    "id": "BODY",
    "label": "Körpergewicht",
    "group": "Kein Equipment",
    "category": "Basisausstattung",
    "defaultAvailable": true,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "FLOOR",
    "label": "Freie Bodenfläche",
    "group": "Kein Equipment",
    "category": "Basisausstattung",
    "defaultAvailable": true,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "MAT",
    "label": "Trainingsmatte",
    "group": "Kleinzubehör",
    "category": "Basisausstattung",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "WALL",
    "label": "Wand",
    "group": "Kein Equipment",
    "category": "Basisausstattung",
    "defaultAvailable": true,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "CHAIR",
    "label": "Stabiler Stuhl",
    "group": "Haushalt",
    "category": "Basisausstattung",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "BENCH",
    "label": "Flachbank",
    "group": "Trainingsbank",
    "category": "Bank/Podest",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "ADJ_BENCH",
    "label": "Verstellbare Trainingsbank",
    "group": "Trainingsbank",
    "category": "Bank/Podest",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": [
      "BENCH"
    ]
  },
  {
    "id": "BOX",
    "label": "Plyo-Box",
    "group": "Functional Training",
    "category": "Bank/Podest",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "STEP",
    "label": "Step/Erhöhung",
    "group": "Kleinzubehör",
    "category": "Bank/Podest",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SLIDERS",
    "label": "Gleitpads/Slider",
    "group": "Kleinzubehör",
    "category": "Kleinzubehör",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SLANT_BOARD",
    "label": "Keilbrett/Slant Board",
    "group": "Kleinzubehör",
    "category": "Kleinzubehör",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "DUMBBELL",
    "label": "Kurzhantel(n)",
    "group": "Kurzhanteln",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "BARBELL",
    "label": "Langhantel",
    "group": "Langhantel",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "PLATES",
    "label": "Hantelscheiben",
    "group": "Langhantel",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "RACK",
    "label": "Kniebeugenständer/Power Rack",
    "group": "Langhantel mit Rack",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "EZ_BAR",
    "label": "SZ-Stange",
    "group": "Spezialhanteln",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "TRAP_BAR",
    "label": "Trap-/Hex-Bar",
    "group": "Spezialhanteln",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SSB",
    "label": "Safety-Squat-Bar",
    "group": "Spezialhanteln",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SWISS_BAR",
    "label": "Multi-Grip-/Swiss-Bar",
    "group": "Spezialhanteln",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "KETTLEBELL",
    "label": "Kettlebell(s)",
    "group": "Kettlebell",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "WEIGHT_VEST",
    "label": "Gewichtsweste",
    "group": "Kleinzubehör",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "ANKLE_WEIGHTS",
    "label": "Fuss-/Knöchelgewichte",
    "group": "Kleinzubehör",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "PULLUP_BAR",
    "label": "Klimmzugstange",
    "group": "Klimmzugstange",
    "category": "Körpergewicht",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "DIP_BARS",
    "label": "Dip-Barren/Parallelbarren",
    "group": "Dip-Barren",
    "category": "Körpergewicht",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "PARALLETTES",
    "label": "Parallettes/Liegestützgriffe",
    "group": "Kleinzubehör",
    "category": "Körpergewicht",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "RINGS",
    "label": "Turnringe",
    "group": "Turnringe",
    "category": "Körpergewicht",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "TRX",
    "label": "Schlingentrainer/TRX",
    "group": "TRX/Schlingentrainer",
    "category": "Körpergewicht",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "BAND",
    "label": "Langes Widerstandsband",
    "group": "Widerstandsbänder",
    "category": "Bänder",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "MINIBAND",
    "label": "Miniband/Loop-Band",
    "group": "Widerstandsbänder",
    "category": "Bänder",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "TUBE_BAND",
    "label": "Tube-Band mit Griffen",
    "group": "Widerstandsbänder",
    "category": "Bänder",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "CABLE",
    "label": "Einfacher Kabelzug",
    "group": "Kabelzug",
    "category": "Kabelzug",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "DUAL_CABLE",
    "label": "Doppel-Kabelzug/Crossover",
    "group": "Kabelzug",
    "category": "Kabelzug",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": [
      "CABLE"
    ]
  },
  {
    "id": "LAT_PULLDOWN",
    "label": "Latzugstation",
    "group": "Kabelzug",
    "category": "Kabelzug",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "LOW_ROW",
    "label": "Sitzende Ruderzugstation",
    "group": "Kabelzug",
    "category": "Kabelzug",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "LANDMINE",
    "label": "Landmine-Aufnahme",
    "group": "Landmine",
    "category": "Freie Gewichte",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SMITH",
    "label": "Multipresse/Smith Machine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "LEG_PRESS",
    "label": "Beinpresse",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "HACK_SQUAT",
    "label": "Hackenschmidt-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "BELT_SQUAT",
    "label": "Belt-Squat-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "LEG_EXTENSION",
    "label": "Beinstrecker-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "LEG_CURL",
    "label": "Beinbeuger-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "HIP_THRUST_MACHINE",
    "label": "Hip-Thrust-/Glute-Drive-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "CALF_MACHINE",
    "label": "Wadenheben-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "HIP_ABD_MACHINE",
    "label": "Abduktoren-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "HIP_ADD_MACHINE",
    "label": "Adduktoren-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "CHEST_PRESS_MACHINE",
    "label": "Brustpresse",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SHOULDER_PRESS_MACHINE",
    "label": "Schulterpresse",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "PEC_DECK",
    "label": "Butterfly-/Pec-Deck-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "REVERSE_FLY_MACHINE",
    "label": "Reverse-Fly-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "ROW_MACHINE",
    "label": "Rudermaschine (Kraft)",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "PULLDOWN_MACHINE",
    "label": "Latzugmaschine (Plate-loaded)",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "ASSISTED_PULLUP",
    "label": "Unterstützte Klimmzug-/Dip-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "BICEPS_MACHINE",
    "label": "Bizepscurl-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "TRICEPS_MACHINE",
    "label": "Trizepsstrecker-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "AB_MACHINE",
    "label": "Bauchpresse/Crunch-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "BACK_EXTENSION_MACHINE",
    "label": "Rückenstrecker-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "PREACHER_BENCH",
    "label": "Scottbank",
    "group": "Trainingsbank",
    "category": "Bank/Podest",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "GHD",
    "label": "Glute-Ham-Developer",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "BACK_EXTENSION_BENCH",
    "label": "45°-/90°-Rückenstreckerbank",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "REVERSE_HYPER",
    "label": "Reverse-Hyper-Maschine",
    "group": "Kraftmaschinen",
    "category": "Maschine",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "AB_WHEEL",
    "label": "Bauchroller/Ab-Wheel",
    "group": "Kleinzubehör",
    "category": "Kleinzubehör",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SWISS_BALL",
    "label": "Gymnastikball/Swiss Ball",
    "group": "Kleinzubehör",
    "category": "Kleinzubehör",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "BOSU",
    "label": "BOSU-Ball",
    "group": "Kleinzubehör",
    "category": "Kleinzubehör",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "FOAM_ROLLER",
    "label": "Faszienrolle",
    "group": "Kleinzubehör",
    "category": "Kleinzubehör",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "MED_BALL",
    "label": "Medizinball",
    "group": "Functional Training",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SLAM_BALL",
    "label": "Slam Ball",
    "group": "Functional Training",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SANDBAG",
    "label": "Sandsack (Training)",
    "group": "Functional Training",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SLED",
    "label": "Gewichtsschlitten",
    "group": "Strongman/Functional",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "FARMER_HANDLES",
    "label": "Farmer-Walk-Griffe",
    "group": "Strongman/Functional",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "YOKE",
    "label": "Yoke/Joch",
    "group": "Strongman/Functional",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "TIRE",
    "label": "Trainingsreifen",
    "group": "Strongman/Functional",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SLEDGEHAMMER",
    "label": "Vorschlaghammer",
    "group": "Strongman/Functional",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "BATTLE_ROPE",
    "label": "Battle Ropes",
    "group": "Strongman/Functional",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "ROPE",
    "label": "Kletterseil",
    "group": "Strongman/Functional",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "MACE",
    "label": "Steel Mace/Keule",
    "group": "Functional Training",
    "category": "Functional",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "GRIPPER",
    "label": "Handgripper",
    "group": "Kleinzubehör",
    "category": "Kleinzubehör",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "WRIST_ROLLER",
    "label": "Wrist Roller",
    "group": "Kleinzubehör",
    "category": "Kleinzubehör",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "NECK_HARNESS",
    "label": "Nackentrainer/Nacken-Geschirr",
    "group": "Kleinzubehör",
    "category": "Kleinzubehör",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "JUMP_ROPE",
    "label": "Springseil",
    "group": "Cardiogeräte",
    "category": "Cardio",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "TREADMILL",
    "label": "Laufband",
    "group": "Cardiogeräte",
    "category": "Cardio",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "BIKE",
    "label": "Fahrradergometer/Spinning-Bike",
    "group": "Cardiogeräte",
    "category": "Cardio",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "AIR_BIKE",
    "label": "Air Bike",
    "group": "Cardiogeräte",
    "category": "Cardio",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "ROWER",
    "label": "Ruderergometer",
    "group": "Cardiogeräte",
    "category": "Cardio",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "SKI_ERG",
    "label": "SkiErg",
    "group": "Cardiogeräte",
    "category": "Cardio",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "ELLIPTICAL",
    "label": "Crosstrainer",
    "group": "Cardiogeräte",
    "category": "Cardio",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "STAIR_CLIMBER",
    "label": "Stair Climber/Stepper",
    "group": "Cardiogeräte",
    "category": "Cardio",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "POOL",
    "label": "Schwimmbecken",
    "group": "Schwimmen",
    "category": "Cardio",
    "defaultAvailable": false,
    "fullGym": false,
    "implies": []
  },
  {
    "id": "OUTDOOR",
    "label": "Outdoor-Strecke",
    "group": "Outdoor",
    "category": "Cardio",
    "defaultAvailable": false,
    "fullGym": false,
    "implies": []
  },
  {
    "id": "SISSY_SQUAT",
    "label": "Sissy-Squat-Station",
    "group": "Voll ausgestattetes Fitnessstudio",
    "category": "Maschine / Station",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "TOWEL",
    "label": "Handtuch",
    "group": "Kleingeräte",
    "category": "Kleingerät",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "PINCH_BLOCK",
    "label": "Pinch-Block",
    "group": "Kleingeräte",
    "category": "Kleingerät",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  },
  {
    "id": "FAT_GRIP",
    "label": "Griffverdickung",
    "group": "Kleingeräte",
    "category": "Kleingerät",
    "defaultAvailable": false,
    "fullGym": true,
    "implies": []
  }
];

export const EQUIPMENT_PRESETS: EquipmentPreset[] = [
  {
    "id": "PRESET_BODY",
    "label": "Kein Equipment",
    "description": "Körpergewicht, freie Bodenfläche und Wand",
    "equipmentIds": [
      "BODY",
      "FLOOR",
      "WALL"
    ]
  },
  {
    "id": "PRESET_BODY_MAT",
    "label": "Körpergewicht + Matte",
    "description": "Basisausstattung plus Trainingsmatte",
    "equipmentIds": [
      "BODY",
      "FLOOR",
      "MAT",
      "WALL"
    ]
  },
  {
    "id": "PRESET_DUMBBELL",
    "label": "Kurzhanteln",
    "description": "Basisausstattung plus Kurzhanteln",
    "equipmentIds": [
      "BODY",
      "DUMBBELL",
      "FLOOR",
      "WALL"
    ]
  },
  {
    "id": "PRESET_DUMBBELL_BENCH",
    "label": "Kurzhanteln + verstellbare Bank",
    "description": "Kurzhanteln und verstellbare Bank; die Bank erfüllt auch die Funktion einer Flachbank",
    "equipmentIds": [
      "ADJ_BENCH",
      "BENCH",
      "BODY",
      "DUMBBELL",
      "FLOOR",
      "WALL"
    ]
  },
  {
    "id": "PRESET_BARBELL",
    "label": "Langhantel + Scheiben",
    "description": "Basisausstattung plus Langhantel und Gewichtsscheiben",
    "equipmentIds": [
      "BARBELL",
      "BODY",
      "FLOOR",
      "PLATES",
      "WALL"
    ]
  },
  {
    "id": "PRESET_BARBELL_RACK",
    "label": "Langhantel + Rack + Bank",
    "description": "Langhantel-Setup mit Scheiben, Rack und verstellbarer Bank",
    "equipmentIds": [
      "ADJ_BENCH",
      "BARBELL",
      "BENCH",
      "BODY",
      "FLOOR",
      "PLATES",
      "RACK",
      "WALL"
    ]
  },
  {
    "id": "PRESET_KETTLEBELL",
    "label": "Kettlebell",
    "description": "Basisausstattung plus eine oder mehrere Kettlebells",
    "equipmentIds": [
      "BODY",
      "FLOOR",
      "KETTLEBELL",
      "WALL"
    ]
  },
  {
    "id": "PRESET_PULLUP",
    "label": "Klimmzugstange",
    "description": "Basisausstattung plus Klimmzugstange",
    "equipmentIds": [
      "BODY",
      "FLOOR",
      "PULLUP_BAR",
      "WALL"
    ]
  },
  {
    "id": "PRESET_BANDS",
    "label": "Widerstandsbänder",
    "description": "Basisausstattung plus lange Bänder, Minibands und Tubeband",
    "equipmentIds": [
      "BAND",
      "BODY",
      "FLOOR",
      "MINIBAND",
      "TUBE_BAND",
      "WALL"
    ]
  },
  {
    "id": "PRESET_TRX",
    "label": "Schlingentrainer / TRX",
    "description": "Basisausstattung plus Schlingentrainer",
    "equipmentIds": [
      "BODY",
      "FLOOR",
      "TRX",
      "WALL"
    ]
  },
  {
    "id": "PRESET_RINGS",
    "label": "Turnringe",
    "description": "Basisausstattung plus Turnringe",
    "equipmentIds": [
      "BODY",
      "FLOOR",
      "RINGS",
      "WALL"
    ]
  },
  {
    "id": "PRESET_HOME_COMPLETE",
    "label": "Gut ausgestattetes Home Gym",
    "description": "Kurzhanteln, Langhantel, Rack, Bank, Klimmzugstange, Kettlebells und Bänder",
    "equipmentIds": [
      "ADJ_BENCH",
      "BAND",
      "BARBELL",
      "BENCH",
      "BODY",
      "DUMBBELL",
      "FLOOR",
      "KETTLEBELL",
      "MAT",
      "MINIBAND",
      "PLATES",
      "PULLUP_BAR",
      "RACK",
      "TRX",
      "WALL"
    ]
  },
  {
    "id": "PRESET_FULL_GYM",
    "label": "Voll ausgestattetes Fitnessstudio",
    "description": "Alle als Studioausstattung markierten Geräte und Basisequipment",
    "equipmentIds": [
      "AB_MACHINE",
      "AB_WHEEL",
      "ADJ_BENCH",
      "AIR_BIKE",
      "ANKLE_WEIGHTS",
      "ASSISTED_PULLUP",
      "BACK_EXTENSION_BENCH",
      "BACK_EXTENSION_MACHINE",
      "BAND",
      "BARBELL",
      "BATTLE_ROPE",
      "BELT_SQUAT",
      "BENCH",
      "BICEPS_MACHINE",
      "BIKE",
      "BODY",
      "BOSU",
      "BOX",
      "CABLE",
      "CALF_MACHINE",
      "CHAIR",
      "CHEST_PRESS_MACHINE",
      "DIP_BARS",
      "DUAL_CABLE",
      "DUMBBELL",
      "ELLIPTICAL",
      "EZ_BAR",
      "FARMER_HANDLES",
      "FAT_GRIP",
      "FLOOR",
      "FOAM_ROLLER",
      "GHD",
      "GRIPPER",
      "HACK_SQUAT",
      "HIP_ABD_MACHINE",
      "HIP_ADD_MACHINE",
      "HIP_THRUST_MACHINE",
      "JUMP_ROPE",
      "KETTLEBELL",
      "LANDMINE",
      "LAT_PULLDOWN",
      "LEG_CURL",
      "LEG_EXTENSION",
      "LEG_PRESS",
      "LOW_ROW",
      "MACE",
      "MAT",
      "MED_BALL",
      "MINIBAND",
      "NECK_HARNESS",
      "PARALLETTES",
      "PEC_DECK",
      "PINCH_BLOCK",
      "PLATES",
      "PREACHER_BENCH",
      "PULLDOWN_MACHINE",
      "PULLUP_BAR",
      "RACK",
      "REVERSE_FLY_MACHINE",
      "REVERSE_HYPER",
      "RINGS",
      "ROPE",
      "ROWER",
      "ROW_MACHINE",
      "SANDBAG",
      "SHOULDER_PRESS_MACHINE",
      "SISSY_SQUAT",
      "SKI_ERG",
      "SLAM_BALL",
      "SLANT_BOARD",
      "SLED",
      "SLEDGEHAMMER",
      "SLIDERS",
      "SMITH",
      "SSB",
      "STAIR_CLIMBER",
      "STEP",
      "SWISS_BALL",
      "SWISS_BAR",
      "TIRE",
      "TOWEL",
      "TRAP_BAR",
      "TREADMILL",
      "TRICEPS_MACHINE",
      "TRX",
      "TUBE_BAND",
      "WALL",
      "WEIGHT_VEST",
      "WRIST_ROLLER",
      "YOKE"
    ]
  }
];

export const POPULAR_EQUIPMENT_IDS = [
  "MAT",
  "CHAIR",
  "DUMBBELL",
  "KETTLEBELL",
  "BARBELL",
  "PLATES",
  "RACK",
  "ADJ_BENCH",
  "PULLUP_BAR",
  "DIP_BARS",
  "TRX",
  "RINGS",
  "BAND",
  "MINIBAND",
  "TUBE_BAND",
  "CABLE",
  "DUAL_CABLE",
  "LAT_PULLDOWN",
  "LOW_ROW",
  "LEG_PRESS",
  "LEG_EXTENSION",
  "LEG_CURL",
  "TREADMILL",
  "BIKE",
  "ROWER",
  "POOL",
  "OUTDOOR"
] as const;

export const DEFAULT_EQUIPMENT_IDS = EQUIPMENT.filter((item) => item.defaultAvailable).map((item) => item.id);
