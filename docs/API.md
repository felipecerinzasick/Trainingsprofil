# API-Übersicht

Lokale Basis-URL:

```text
http://127.0.0.1:8000/api
```

Die automatisch generierte OpenAPI-Oberfläche liegt unter:

```text
http://127.0.0.1:8000/docs
```

## Authentifizierung

Geschützte Endpunkte erwarten:

```http
Authorization: Bearer <access-token>
```

## Endpunkte

| Methode | Pfad | Auth | Zweck |
|---|---|---:|---|
| `GET` | `/health` | nein | Health Check |
| `POST` | `/auth/register` | nein | Konto erstellen und Token erhalten |
| `POST` | `/auth/login` | nein | Anmelden und Token erhalten |
| `GET` | `/auth/me` | ja | aktuellen Benutzer laden |
| `GET` | `/profile` | ja | gespeichertes Profil laden |
| `PUT` | `/profile` | ja | Profil speichern oder ersetzen |
| `DELETE` | `/profile` | ja | aktuelles Profil löschen |
| `POST` | `/plans/generate` | ja | Plan erzeugen und speichern |
| `GET` | `/plans` | ja | eigene Pläne auflisten |
| `GET` | `/plans/{plan_id}` | ja | eigenen Plan öffnen |
| `GET` | `/plans/{plan_id}/pdf` | ja | eigenen Plan als PDF laden |
| `DELETE` | `/plans/{plan_id}` | ja | eigenen Plan löschen |
| `GET` | `/exercises/{exercise_id}` | nein | Übungsdetails: Muskeln, Equipment, Technikhinweise, Abbildungen |

## Übungsdetails

`GET /api/exercises/EX001213` liefert die deutschen Katalogdaten einer Übung (Bewegungsmuster, Haupt- und Nebenmuskeln, Equipment, Schwierigkeit, Technikhinweise pro Bewegungsmuster) sowie unter `media` zwei Fotos (Ausgangs- und Endposition) aus der gemeinfreien [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (Unlicense). `media` ist `null`, wenn für eine Übung kein passendes Bildmaterial vorliegt; `media.match` ist `exact`, `similar` oder `variant` (Abbildung zeigt die Grundform der Übung). Die Zuordnung wird mit `backend/scripts/build_exercise_media.py` erzeugt und in `backend/app/data/exercise_media.json` gespeichert. Die Datei enthält zusätzlich die englischen Schritt-für-Schritt-Anleitungen des Datensatzes; sie werden derzeit nicht ausgeliefert. Die Bild-URL-Basis ist über `TRAINING_EXERCISE_MEDIA_BASE_URL` konfigurierbar.

## Registrierung

```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "Nora",
  "email": "nora@example.com",
  "password": "mindestens-acht-zeichen"
}
```

Antwort:

```json
{
  "accessToken": "…",
  "tokenType": "bearer",
  "user": {
    "id": "…",
    "email": "nora@example.com",
    "firstName": "Nora",
    "isActive": true,
    "createdAt": "2026-08-15T10:00:00Z"
  }
}
```

## Profil speichern

Der Body entspricht `frontend/training-profile.schema.json`.

```http
PUT /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{ ...TrainingProfile v1.0... }
```

## Plan generieren

Mit dem gespeicherten Profil:

```http
POST /api/plans/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "durationWeeks": 8
}
```

Mit einem gleichzeitig übergebenen und gespeicherten Profil:

```json
{
  "profile": { "schemaVersion": "1.0", "...": "..." },
  "durationWeeks": 12,
  "title": "Vorbereitung Zürich Marathon"
}
```

Unterstützte Planlängen:

```text
4, 8, 12 oder 16 Wochen
```

## Sicherheitsblock

Bei einer nicht aufgelösten Red Flag antwortet die API mit HTTP `409`:

```json
{
  "detail": {
    "code": "MEDICAL_CLEARANCE_REQUIRED",
    "message": "Der Plan wird aus Sicherheitsgründen noch nicht automatisch erstellt.",
    "notices": [
      "Ungeklärter Schwindel muss vor der automatischen Planerstellung fachlich abgeklärt werden."
    ]
  }
}
```

Das Frontend darf diesen Fehler nicht wie einen technischen Fehler verstecken. Die Hinweise müssen sichtbar angezeigt werden.

## Eigentumsprüfung

Planabfragen verwenden immer gleichzeitig:

```text
plan_id UND user_id des angemeldeten Kontos
```

Dadurch liefert auch eine existierende fremde Plan-ID für den aktuellen Benutzer `404`.

## Planformat

- formales Schema: `docs/training-plan.schema.json`
- TypeScript-Typen: `frontend/src/api/types.ts`
- Beispiele: `sample-output/*.json`
