import { useMemo, useState } from "react";
import { DEFAULT_EQUIPMENT_IDS, EQUIPMENT, EQUIPMENT_PRESETS, POPULAR_EQUIPMENT_IDS } from "../../data/equipment";
import { TRAINING_LOCATIONS } from "../../data/options";
import { Icon } from "../Icon";
import { Chip, ChoiceCard, Field, Notice, SectionHeading } from "../ui";
import type { StepProps } from "./types";
import { toggleValue } from "./types";

const FEATURED_PRESETS = [
  "PRESET_BODY",
  "PRESET_BODY_MAT",
  "PRESET_DUMBBELL",
  "PRESET_DUMBBELL_BENCH",
  "PRESET_BARBELL_RACK",
  "PRESET_KETTLEBELL",
  "PRESET_TRX",
  "PRESET_FULL_GYM",
];


const LOCATION_EQUIPMENT: Record<string, string> = {
  outdoor: "OUTDOOR",
  pool: "POOL",
};

const PRESET_ICONS: Record<string, string> = {
  PRESET_BODY: "user",
  PRESET_BODY_MAT: "mobility",
  PRESET_DUMBBELL: "dumbbell",
  PRESET_DUMBBELL_BENCH: "dumbbell",
  PRESET_BARBELL: "dumbbell",
  PRESET_BARBELL_RACK: "dumbbell",
  PRESET_KETTLEBELL: "bolt",
  PRESET_PULLUP: "user",
  PRESET_BANDS: "refresh",
  PRESET_TRX: "user",
  PRESET_RINGS: "user",
  PRESET_HOME_COMPLETE: "home",
  PRESET_FULL_GYM: "building",
};

function expandImpliedEquipment(ids: string[]) {
  const result = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    EQUIPMENT.forEach((item) => {
      if (!result.has(item.id)) return;
      item.implies.forEach((impliedId) => {
        if (!result.has(impliedId)) {
          result.add(impliedId);
          changed = true;
        }
      });
    });
  }
  DEFAULT_EQUIPMENT_IDS.forEach((id) => result.add(id));
  return [...result];
}

export function EquipmentStep({ profile, updateSection }: StepProps) {
  const { environment } = profile;
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showMorePresets, setShowMorePresets] = useState(false);

  const selectedSet = useMemo(() => new Set(environment.equipmentIds), [environment.equipmentIds]);
  const visibleSelected = EQUIPMENT.filter((item) => selectedSet.has(item.id) && !item.defaultAvailable);
  const selectedCustomCount = visibleSelected.length;

  const presets = EQUIPMENT_PRESETS.filter((preset) => showMorePresets || FEATURED_PRESETS.includes(preset.id));

  const groups = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const source = showAll || searchTerm
      ? EQUIPMENT.filter((item) => !item.defaultAvailable)
      : EQUIPMENT.filter((item) => POPULAR_EQUIPMENT_IDS.includes(item.id as (typeof POPULAR_EQUIPMENT_IDS)[number]));
    const filtered = source.filter((item) =>
      !searchTerm || `${item.label} ${item.group} ${item.category}`.toLowerCase().includes(searchTerm),
    );
    return filtered.reduce<Record<string, typeof EQUIPMENT>>((accumulator, item) => {
      if (!accumulator[item.group]) accumulator[item.group] = [];
      accumulator[item.group].push(item);
      return accumulator;
    }, {});
  }, [search, showAll]);

  const locationEquipmentIds = environment.locations
    .map((locationId) => LOCATION_EQUIPMENT[locationId])
    .filter((equipmentId): equipmentId is string => Boolean(equipmentId));

  const applyPreset = (ids: string[]) => {
    updateSection("environment", {
      equipmentIds: expandImpliedEquipment([...ids, ...locationEquipmentIds]),
    });
  };

  const toggleLocation = (locationId: string) => {
    const selected = environment.locations.includes(locationId);
    const locations = toggleValue(environment.locations, locationId);
    const mappedEquipmentId = LOCATION_EQUIPMENT[locationId];
    let equipmentIds = [...environment.equipmentIds];

    if (mappedEquipmentId) {
      equipmentIds = selected
        ? equipmentIds.filter((id) => id !== mappedEquipmentId)
        : [...equipmentIds, mappedEquipmentId];
    }

    updateSection("environment", {
      locations,
      equipmentIds: expandImpliedEquipment(equipmentIds),
    });
  };

  const toggleEquipment = (id: string) => {
    if (DEFAULT_EQUIPMENT_IDS.includes(id)) return;
    const next = selectedSet.has(id)
      ? environment.equipmentIds.filter((item) => item !== id)
      : [...environment.equipmentIds, id];
    updateSection("environment", { equipmentIds: expandImpliedEquipment(next) });
  };

  const isPresetActive = (ids: string[]) => {
    const normalized = expandImpliedEquipment(ids);
    return normalized.length === environment.equipmentIds.length && normalized.every((id) => selectedSet.has(id));
  };

  return (
    <div className="step-content">
      <SectionHeading
        eyebrow="Deine Möglichkeiten"
        title="Wo und womit kannst du trainieren?"
        text="Wähle zuerst den Trainingsort und dann ein passendes Geräte-Setup. Im Detail kannst du alles anpassen."
      />

      <div className="form-section">
        <Field label="Wo trainierst du regelmässig?" hint="Mehrfachauswahl möglich">
          <div className="choice-grid choice-grid--locations">
            {TRAINING_LOCATIONS.map((location) => (
              <ChoiceCard
                key={location.id}
                selected={environment.locations.includes(location.id)}
                title={location.label}
                description={location.description}
                icon={location.icon}
                compact
                onClick={() => toggleLocation(location.id)}
              />
            ))}
          </div>
        </Field>
      </div>

      <div className="form-section">
        <div className="field__label-row equipment-title-row">
          <div>
            <label>Welche Ausstattung passt am besten?</label>
            <p className="field__hint">Eine Schnellauswahl ersetzt die aktuelle Geräteliste. Danach kannst du einzelne Geräte ergänzen.</p>
          </div>
          <span>{selectedCustomCount} Geräte gewählt</span>
        </div>
        <div className="preset-grid">
          {presets.map((preset) => {
            const active = isPresetActive(preset.equipmentIds);
            return (
              <button
                type="button"
                key={preset.id}
                className={`preset-card ${active ? "is-selected" : ""}`}
                aria-pressed={active}
                onClick={() => applyPreset(preset.equipmentIds)}
              >
                <span className="preset-card__icon"><Icon name={PRESET_ICONS[preset.id] ?? "settings"} size={23} /></span>
                <span><strong>{preset.label}</strong><small>{preset.description}</small></span>
                <i><Icon name="check" size={14} /></i>
              </button>
            );
          })}
        </div>
        <button type="button" className="text-button" onClick={() => setShowMorePresets((value) => !value)}>
          {showMorePresets ? "Weniger Setups zeigen" : "Weitere Setups anzeigen"}
          <Icon name="chevron-down" size={17} className={showMorePresets ? "is-rotated" : ""} />
        </button>
      </div>

      <div className="form-section equipment-detail-panel">
        <div className="equipment-detail-panel__header">
          <div>
            <span className="eyebrow">Feinabstimmung</span>
            <h3>Geräte im Detail</h3>
            <p>Suche nach einem Gerät oder öffne die vollständige Auswahl.</p>
          </div>
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Gerät suchen …"
              aria-label="Gerät suchen"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Suche löschen"><Icon name="x" size={15} /></button>}
          </div>
        </div>

        {visibleSelected.length > 0 && (
          <div className="selected-equipment">
            <div className="selected-equipment__label"><Icon name="check-circle" size={18} /> Ausgewählt</div>
            <div className="chip-group">
              {visibleSelected.slice(0, 10).map((item) => (
                <Chip key={item.id} selected onClick={() => toggleEquipment(item.id)}>{item.label}</Chip>
              ))}
              {visibleSelected.length > 10 && <span className="more-count">+{visibleSelected.length - 10} weitere</span>}
            </div>
          </div>
        )}

        <div className="equipment-groups">
          {Object.entries(groups).map(([group, items]) => (
            <details key={group} open={Boolean(search) || !showAll}>
              <summary>
                <span>{group}</span>
                <small>{items.filter((item) => selectedSet.has(item.id)).length}/{items.length} gewählt</small>
                <Icon name="chevron-down" size={17} />
              </summary>
              <div className="equipment-options">
                {items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={selectedSet.has(item.id) ? "is-selected" : ""}
                    aria-pressed={selectedSet.has(item.id)}
                    onClick={() => toggleEquipment(item.id)}
                  >
                    <span>{item.label}</span>
                    <i><Icon name="check" size={13} /></i>
                  </button>
                ))}
              </div>
            </details>
          ))}
          {Object.keys(groups).length === 0 && (
            <div className="empty-search"><Icon name="search" size={25} /><strong>Kein passendes Gerät gefunden</strong><span>Versuche einen allgemeineren Suchbegriff.</span></div>
          )}
        </div>

        {!search && (
          <button type="button" className="button button--soft equipment-show-all" onClick={() => setShowAll((value) => !value)}>
            {showAll ? "Nur häufige Geräte zeigen" : `Alle ${EQUIPMENT.length} Equipment-Typen anzeigen`}
            <Icon name="chevron-down" size={17} className={showAll ? "is-rotated" : ""} />
          </button>
        )}
      </div>

      <div className="form-section">
        <Field label="Gibt es Besonderheiten bei deiner Ausstattung?" optional htmlFor="equipment-notes">
          <textarea
            id="equipment-notes"
            rows={3}
            placeholder="Zum Beispiel: nur eine leichte Kettlebell, wenig Platz, Studio nur am Wochenende …"
            value={environment.equipmentNotes}
            onChange={(event) => updateSection("environment", { equipmentNotes: event.target.value })}
          />
        </Field>
      </div>

      <Notice icon="dumbbell">
        Körpergewicht, freie Bodenfläche und eine Wand werden als Grundausstattung angenommen. Eine Übung wird später nur gewählt, wenn alle benötigten Geräte vorhanden sind.
      </Notice>
    </div>
  );
}
