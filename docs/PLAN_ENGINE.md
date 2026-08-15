# Plan-Engine

## Grundprinzip

Die Engine erzeugt Trainingsblöcke aus strukturierten Regeln. Sie ist kein zufälliger Textgenerator. Das Ergebnis enthält konkrete Wochen, Termine, Einheiten, Übungen, Sätze, Wiederholungen, Intensitäten, Pausen, Alternativen und persönliche Anpassungen.

Version im Plan:

```json
{
  "schemaVersion": "1.0",
  "engineVersion": "1.0.0"
}
```

## 1. Ziel- und Sporterkennung

Aus Hauptziel, Sportarten und Eventtyp wird ein interner Planfokus abgeleitet, zum Beispiel:

- `marathon`
- `half_marathon`
- `running_event`
- `trail`
- `triathlon`
- `cycling`
- `swimming`
- `hiking`
- `strength`
- `health_strength`
- `mobility`
- `return`
- `hybrid`

## 2. Sicherheitsprüfung

`backend/app/services/safety.py` bewertet strukturierte Sicherheitsangaben.

Bestimmte ungeklärte Angaben blockieren die Generierung vollständig. Das Ergebnis ist kein leerer oder vermeintlich „vorsichtiger“ Plan, sondern ein klarer `409`-Fehler mit sichtbaren Hinweisen.

Diese Prüfung ist von normalen Beschwerden getrennt. Ein bekanntes, fachlich freigegebenes Knieproblem kann beispielsweise zu Anpassungen führen; ungeklärter Brustschmerz darf nicht einfach mit leichteren Übungen umgangen werden.

## 3. Beschwerden und Einschränkungen

`backend/app/services/restrictions.py` übersetzt jede Einschränkung nach:

- Körperregion
- Seite
- Intensität
- Symptomen
- Auslösern
- Strategie
- fachlicher Freigabe
- Freitext

Strategien:

- `avoid` – betroffene Muster beziehungsweise Regionen ausschliessen
- `adapt` – geeignete Varianten erlauben, aber Belastung und Ausführung anpassen
- `monitor` – grundsätzlich zulassen, Rückmeldung beobachten

Die Engine arbeitet nicht mit einer pauschalen Regel wie „Arm tut weh → alle Armübungen entfernen“. Stattdessen werden Bewegungsmuster, primäre Muskelgruppen, Übungsnamen und Belastungsmerkmale kombiniert.

## 4. Equipment

Eine Übung wird nur zugelassen, wenn **alle** erforderlichen Equipment-IDs verfügbar sind.

```text
required_equipment ⊆ available_equipment
```

Die verfügbare Menge besteht aus:

- expliziter Nutzerauswahl
- automatisch abgeleitetem Equipment aus Trainingsorten
- konservativen Equipment-Implikationen aus der Datenbank

Beispiele:

- Outdoor-Trainingsort → Outdoor-Strecke
- Schwimmbad → Pool
- verstellbare Bank → erfüllt auch die Funktion einer Flachbank

## 5. Schwierigkeit und Coaching-Bedarf

Erfahrung und Alter bestimmen unter anderem:

- maximale Übungsschwierigkeit
- Zulassung von Übungen mit erhöhtem Coaching-Bedarf
- Satzanzahl
- Wiederholungsbereich
- Ziel-RPE
- Pausen
- Bewegungstempo

Ältere und wieder einsteigende Personen erhalten konservativere Einstufungen und bei Bedarf zusätzliche Gleichgewichtsarbeit.

## 6. Wochenstruktur

Die Engine wählt aus den verfügbaren Wochentagen möglichst gleichmässig verteilte Trainingstage. Bei Ausdauerzielen wird ein Wochenendtag für lange Einheiten bevorzugt, sofern verfügbar.

Sportartspezifische Blueprints definieren die Mischung:

### Beispiel Marathon mit fünf Einheiten

- lockerer Lauf
- Ganzkörper-Krafttraining
- Qualitätslauf
- Regenerationslauf/Gehmix
- langer Lauf

### Beispiel Triathlon mit sechs Einheiten

- lockeres Schwimmen
- Laufqualität
- lange Radausfahrt
- Krafttraining
- Schwimmqualität
- Koppeleinheit Rad + Lauf

### Beispiel gesundes Älterwerden mit drei Einheiten

- Ganzkörper A
- zügiges Gehen/Wandern
- Ganzkörper B

## 7. Belastungsprogression

Die Pläne verwenden wiederkehrende Vier-Wochen-Wellen:

1. Technik und Ausgangsbelastung
2. moderater Aufbau
3. stärkster Belastungsreiz
4. Entlastung

Bei 8, 12 oder 16 Wochen werden diese Wellen mit weiterentwickelten Wochenzielen fortgeführt. Eventnähe beeinflusst zusätzlich die Phase.

## 8. Übungsranking

Für jedes benötigte Bewegungsmuster werden Übungen aus der Datenbank gerankt. Kriterien umfassen:

- vollständige Equipment-Verfügbarkeit
- keine hart blockierte Restriktion
- passende Kategorie und Bewegungsmuster
- zulässige Schwierigkeit
- Coaching-Anforderung
- redaktionelle Planpriorität
- Bekanntheit und Standardanzeige
- bevorzugter Trainingsstil
- Körpergewichtspräferenz
- Vermeidung bereits verwendeter Übungsfamilien

Jede gewählte Übung erhält bis zu zwei passende Alternativen.

## 9. Verschreibung

Die konkrete Verschreibung hängt unter anderem ab von:

- Planfokus
- Erfahrung
- Alter
- Mehrgelenkigkeit
- Bewegungsmuster
- Woche innerhalb der Belastungswelle

Ausgegeben werden:

- Sätze
- Wiederholungen beziehungsweise Haltezeit/Distanz
- Pause
- Tempo
- Ziel-RPE
- Progressionshinweis
- Anpassungshinweise
- Alternativen

## 10. Erweiterung

### Neue Sportart

1. Ziel-/Disziplin-Mapping in `plan_engine.py` ergänzen.
2. Wochen-Blueprints ergänzen.
3. Session Builder in `session_builders.py` ergänzen.
4. Tests mit mindestens zwei Profiltypen hinzufügen.

### Neue Restriktionsregel

1. Körperregion beziehungsweise Trigger in `restrictions.py` definieren.
2. Blockierte Muster/Muskeln und Anpassungshinweise festlegen.
3. Positiv- und Negativtest ergänzen.
4. Fachlich prüfen lassen.

### KI-Unterstützung

Eine spätere KI-Schicht kann sinnvoll sein für:

- verständlichere Erklärungen
- variierenden Coaching-Ton
- Zusammenfassung von Freitext
- Vorschläge für Alternativen

Nicht an ein unkontrolliertes Modell delegiert werden sollten:

- Red-Flag-Freigabe
- Eigentums- und Zugriffskontrolle
- vollständige Equipment-Prüfung
- harte Kontraindikationen
- Schema- und Datenbankvalidierung
