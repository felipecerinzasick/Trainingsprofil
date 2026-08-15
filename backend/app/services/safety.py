from __future__ import annotations

from dataclasses import dataclass
from typing import Any


SAFETY_LABELS = {
    "chest_symptoms": "Brustschmerz oder ungewöhnliche Atemnot bei Belastung",
    "dizziness": "Schwindel, Ohnmacht oder ungeklärte Gleichgewichtsprobleme",
    "cardio_condition": "Herz-Kreislauf-Erkrankung oder nicht eingestellter Blutdruck",
    "recent_surgery": "kürzliche Operation, akute Verletzung oder ärztliche Trainingspause",
    "pregnancy": "Schwangerschaft oder frühe Phase nach der Geburt",
    "neurological": "neurologische Symptome, Lähmung oder zunehmende Taubheit",
}


@dataclass
class SafetyGateError(Exception):
    messages: list[str]

    def __str__(self) -> str:
        return "; ".join(self.messages)


def evaluate_safety(profile: dict[str, Any]) -> dict[str, Any]:
    health = profile.get("health", {})
    consent = profile.get("consent", {})
    blockers: list[str] = []
    notices: list[str] = []

    if not consent.get("dataProcessing"):
        blockers.append("Die Einwilligung zur Verarbeitung der Profildaten fehlt.")
    if not consent.get("healthAcknowledgement"):
        blockers.append("Die Bestätigung zum verantwortungsvollen Umgang mit Gesundheitsangaben fehlt.")

    if profile.get("identity", {}).get("ageGroup") == "Unter 18":
        blockers.append(
            "Für Minderjährige ist in diesem Prototyp eine individuelle Prüfung und Zustimmung einer erziehungsberechtigten Person erforderlich."
        )

    active_flags = [
        flag.get("id", "")
        for flag in health.get("safetyFlags", [])
        if flag.get("value")
    ]
    for flag_id in active_flags:
        label = SAFETY_LABELS.get(flag_id, flag_id or "eine sicherheitsrelevante Angabe")
        blockers.append(f"Vor der automatischen Planerstellung bitte fachlich abklären: {label}.")

    for restriction in health.get("restrictions", []):
        intensity = int(restriction.get("intensity") or 0)
        clearance = restriction.get("professionalClearance")
        symptoms = set(restriction.get("symptoms", []))
        if intensity >= 8 and clearance != "yes":
            blockers.append(
                "Eine angegebene Einschränkung liegt bei 8/10 oder höher und ist noch nicht fachlich freigegeben."
            )
        if "numbness" in symptoms and clearance != "yes":
            blockers.append(
                "Taubheit oder Kribbeln sollte vor der automatischen Belastungsplanung fachlich abgeklärt werden."
            )

    conditions = set(health.get("conditions", []))
    if "Herz-Kreislauf-Erkrankung" in conditions:
        notices.append("Belastungsintensität nur innerhalb der ärztlich freigegebenen Grenzen steigern.")
    if "Neurologische Erkrankung" in conditions:
        notices.append("Übungsauswahl und Gleichgewichtsanforderungen individuell fachlich prüfen.")
    if "Osteoporose / geringe Knochendichte" in conditions:
        notices.append("Ruckartige Belastungen und stark belastete Rumpfbeugung werden konservativ behandelt.")
    if "Arthrose / Gelenkbeschwerden" in conditions:
        notices.append("Bewegungsumfang und Belastung werden nach Verträglichkeit dosiert.")
    if profile.get("recovery", {}).get("stressLevel", 3) >= 4:
        notices.append("Hoher Alltagsstress: zusätzliche Wiederholungen sind optional, Erholung hat Vorrang.")
    if profile.get("recovery", {}).get("sleepQuality", 3) <= 2:
        notices.append("Bei mehreren Nächten mit schlechtem Schlaf die Intensität um etwa eine Stufe reduzieren.")

    if blockers:
        raise SafetyGateError(list(dict.fromkeys(blockers)))

    return {
        "status": "ready",
        "generationAllowed": True,
        "notices": list(dict.fromkeys(notices)),
        "disclaimer": (
            "Der Plan ist eine automatisierte Trainingshilfe und keine medizinische Diagnose oder Therapie. "
            "Neue, zunehmende oder ungeklärte Beschwerden müssen fachlich abgeklärt werden."
        ),
    }
