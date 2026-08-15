# Lokaler Abnahmetest

Diese Checkliste prüft den MVP aus Sicht eines Benutzers.

## Vorbereitung

- [ ] Backend läuft unter `http://127.0.0.1:8000`.
- [ ] `http://127.0.0.1:8000/api/health` zeigt `status: ok`.
- [ ] Frontend läuft unter `http://127.0.0.1:5173`.
- [ ] Browser-Konsole enthält beim Laden keine Fehler.

## Konto und Profil

- [ ] Neues Konto mit gültiger E-Mail und mindestens acht Zeichen Passwort anlegen.
- [ ] Doppelte Registrierung derselben E-Mail ergibt eine verständliche Meldung.
- [ ] Trainingsprofil vollständig speichern.
- [ ] Browser neu laden; Sitzung und Profil werden wiederhergestellt.
- [ ] Abmelden und erneut anmelden; Profil ist weiterhin vorhanden.

## Equipment

- [ ] Nur Körpergewicht/Matte wählen; Studioübungen dürfen nicht erscheinen.
- [ ] Kurzhanteln ergänzen; passende Kurzhantelübungen erscheinen.
- [ ] Ein Plan verwendet nur Equipment, das im Profil verfügbar ist.
- [ ] Outdoor- oder Pool-Einheiten enthalten das passende Umgebungs-Equipment.

## Einschränkungen

- [ ] Schulter + `avoid` erfassen; direkte Schulter-/Überkopfbelastungen werden nicht ausgewählt.
- [ ] Knie + `adapt` erfassen; der Plan enthält sichtbare Belastungs- und Streckenhinweise.
- [ ] `monitor` erfassen; Hinweise erscheinen, ohne den gesamten Bereich pauschal zu sperren.
- [ ] Red Flag erfassen; Planerstellung wird mit sichtbarer fachlicher Abklärung blockiert.

## Plan

- [ ] 4-Wochen-Plan erzeugen.
- [ ] Plan erscheint im Dashboard.
- [ ] Alle vier Wochen sind auswählbar.
- [ ] Anzahl Einheiten entspricht dem Profil.
- [ ] Einheiten liegen auf verfügbaren Wochentagen.
- [ ] Kraftübungen zeigen Sätze, Wiederholungen, Pause, RPE und Alternativen.
- [ ] Ausdauereinheiten zeigen Abschnitte, Umfang, Intensität und Ausführung.
- [ ] Persönliche Anpassungen sind in der Webansicht sichtbar.
- [ ] Plan kann gelöscht werden und verschwindet aus der Bibliothek.

## PDF

- [ ] PDF-Download startet aus der Planansicht.
- [ ] PDF lässt sich öffnen.
- [ ] Titel, Zeitraum, Ziel und Anpassungen stimmen mit der Webansicht überein.
- [ ] Tabellenüberschriften sind sichtbar.
- [ ] Lange Namen oder Hinweise werden nicht abgeschnitten.
- [ ] Fusszeile und Seitenzahlen sind vorhanden.

## Responsive Darstellung

- [ ] Desktop bei ungefähr 1440 px Breite testen.
- [ ] Tablet bei ungefähr 768 px Breite testen.
- [ ] Smartphone bei ungefähr 390 px Breite testen.
- [ ] Kein horizontaler Seiten-Scroll.
- [ ] Buttons und Eingabefelder sind auf Touch-Geräten ausreichend gross.
- [ ] Wochen- und Einheitenansicht bleibt lesbar.
