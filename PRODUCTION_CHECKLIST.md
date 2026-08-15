# Produktions-Checkliste

Der aktuelle Code ist ein funktionsfähiger lokaler MVP. Diese Punkte müssen vor der Verarbeitung realer Kundendaten in einer öffentlich erreichbaren Anwendung geklärt werden.

## 1. Fachliche und medizinische Verantwortung

- [ ] Planregeln, Restriktionsmapping und Übungsauswahl durch qualifizierte Trainingsfachpersonen prüfen lassen.
- [ ] Prozess für ungeklärte Beschwerden und Red Flags fachlich definieren.
- [ ] Klare Abgrenzung zwischen Trainingshilfe, medizinischer Beratung, Diagnose und Therapie formulieren.
- [ ] Notfall- und Eskalationshinweise im Onboarding und im Plan sichtbar machen.
- [ ] Alters-, Schwangerschafts-, Herz-Kreislauf-, Osteoporose- und Reha-Regeln gesondert validieren.
- [ ] Version jeder Regel und jeder Plan-Engine im erzeugten Plan speichern.
- [ ] Zufällige und gezielte Plan-Stichproben fachlich freigeben.

## 2. Datenschutz und Einwilligung

- [ ] Juristisch klären, welche Gesundheitsdaten erhoben werden dürfen und auf welcher Rechtsgrundlage.
- [ ] Datenschutzerklärung, Nutzungsbedingungen und Einwilligungstexte erstellen.
- [ ] Version und Zeitpunkt jeder Einwilligung serverseitig speichern.
- [ ] Datenminimierung: nur planrelevante Angaben erfassen.
- [ ] Aufbewahrungs- und Löschfristen definieren.
- [ ] Konto-, Profil- und Plandaten vollständig exportierbar und löschbar machen.
- [ ] Auftragsverarbeitungsverträge mit Hosting-, E-Mail-, Analyse- und Support-Anbietern abschliessen.
- [ ] Keine Gesundheitsdaten in Analytics, Fehlertracking oder normalen Anwendungslogs schreiben.
- [ ] Verfahren für Auskunfts-, Berichtigungs- und Löschanfragen dokumentieren.

## 3. Authentifizierung und Kontosicherheit

- [ ] Zugriffstoken nicht dauerhaft im Local Storage speichern.
- [ ] Sichere, `HttpOnly`, `Secure` und geeignete `SameSite`-Cookies oder eine robuste Refresh-Token-Architektur einsetzen.
- [ ] E-Mail-Verifizierung implementieren.
- [ ] Passwort-zurücksetzen-Prozess mit kurzlebigen Einmal-Tokens implementieren.
- [ ] Token-Widerruf und Sitzungsübersicht implementieren.
- [ ] Rate Limits für Registrierung, Login, PDF und Planerstellung einführen.
- [ ] Schutz gegen Credential Stuffing und automatisierte Registrierung ergänzen.
- [ ] Passwortregeln und kompromittierte Passwörter prüfen.
- [ ] Optional Zwei-Faktor-Authentifizierung vorsehen.
- [ ] Sicherheitsrelevante Ereignisse revisionsfähig protokollieren, ohne Gesundheitsinhalte zu loggen.

## 4. Datenbank und Persistenz

- [ ] PostgreSQL statt SQLite einsetzen.
- [ ] Alembic oder ein vergleichbares Migrationssystem einführen.
- [ ] Datenbankzugang nur über verschlüsselte Verbindungen zulassen.
- [ ] Verschlüsselung ruhender Daten und Backups prüfen.
- [ ] Automatische, verschlüsselte Backups mit Wiederherstellungstests einrichten.
- [ ] Indizes und Datenbankgrenzen unter Last testen.
- [ ] Mandantentrennung und Eigentumsprüfungen in allen Abfragen testen.
- [ ] Löschkaskaden und Datenexporte automatisiert testen.

## 5. Infrastruktur

- [ ] Eigene Domain und TLS konfigurieren.
- [ ] Frontend und API hinter einem Reverse Proxy oder Managed Gateway betreiben.
- [ ] Secrets nur über einen Secret Manager bereitstellen.
- [ ] CORS auf die tatsächliche Produktionsdomain beschränken.
- [ ] Entwicklungs- und Produktionsdaten strikt trennen.
- [ ] Health Checks, Uptime-Monitoring und Alarmierung einrichten.
- [ ] Strukturierte Logs mit PII-/Gesundheitsdaten-Filterung einführen.
- [ ] Dependency- und Container-Scans in CI/CD integrieren.
- [ ] Staging-Umgebung vor Produktion einsetzen.

## 6. Anwendung und Nutzererlebnis

- [ ] Passwort vergessen, E-Mail-Verifizierung und Konto löschen im Frontend ergänzen.
- [ ] Leere, fehlerhafte und langsame Zustände für alle Endpunkte testen.
- [ ] Barrierefreiheit nach WCAG prüfen.
- [ ] Smartphone-Tests auf realen iOS- und Android-Geräten durchführen.
- [ ] PDF-Ausgabe für lange Namen, 16 Wochen und viele Anpassungshinweise prüfen.
- [ ] Kalenderexport und Zeitzonenregeln definieren.
- [ ] Änderungen am Profil klar von bestehenden Plänen trennen.
- [ ] Engine-Version und Erstellungszeit für Nutzer transparent anzeigen.
- [ ] Feedback- und Fehlerberichtsfunktion ergänzen.

## 7. Qualitätssicherung

- [ ] Unit-Tests für jede Körperregion und Strategie (`avoid`, `adapt`, `monitor`) ergänzen.
- [ ] Integrationstests für alle Sportfoki und Planlängen ergänzen.
- [ ] End-to-End-Tests mit Playwright oder Cypress einführen.
- [ ] Tests für horizontales Scrollen, Tastaturnavigation und Screenreader ergänzen.
- [ ] Lasttests für Registrierung, Listenansicht, Planerstellung und PDF durchführen.
- [ ] Security Review und Penetrationstest vor öffentlichem Launch durchführen.
- [ ] Fachliche Golden-Testprofile mit erwarteten Plänen versionieren.

## 8. Geschäft und Betrieb

- [ ] Supportprozess und Verantwortlichkeiten definieren.
- [ ] Haftungs-, Versicherungs- und regulatorische Fragen klären.
- [ ] Abonnement-, Zahlungs- und Rückerstattungslogik getrennt vom Plan-Engine-Kern entwickeln.
- [ ] Admin-Rollen mit minimalen Berechtigungen definieren.
- [ ] Incident-Response- und Datenschutzverletzungsprozess dokumentieren.
