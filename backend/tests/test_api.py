from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient
import pytest


ROOT = Path(__file__).resolve().parents[2]


def load_profile() -> dict:
    return json.loads((ROOT / "frontend" / "examples" / "active-senior-profile.json").read_text(encoding="utf-8"))


def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/register",
        json={"email": "elisabeth@example.com", "password": "very-secure-password", "firstName": "Elisabeth"},
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def test_account_profile_plan_and_pdf_flow(client: TestClient) -> None:
    headers = auth_headers(client)
    profile = load_profile()

    save = client.put("/api/profile", headers=headers, json=profile)
    assert save.status_code == 200, save.text

    generated = client.post(
        "/api/plans/generate",
        headers=headers,
        json={"durationWeeks": 4},
    )
    assert generated.status_code == 201, generated.text
    record = generated.json()
    plan_id = record["id"]
    assert record["plan"]["durationWeeks"] == 4
    assert record["plan"]["weeks"][0]["sessions"]

    listing = client.get("/api/plans", headers=headers)
    assert listing.status_code == 200
    assert [item["id"] for item in listing.json()] == [plan_id]

    detail = client.get(f"/api/plans/{plan_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["profileSnapshot"]["identity"]["firstName"] == "Elisabeth"

    pdf = client.get(f"/api/plans/{plan_id}/pdf", headers=headers)
    assert pdf.status_code == 200, pdf.text
    assert pdf.headers["content-type"].startswith("application/pdf")
    assert pdf.content.startswith(b"%PDF")
    assert len(pdf.content) > 20_000

    deleted = client.delete(f"/api/plans/{plan_id}", headers=headers)
    assert deleted.status_code == 200
    assert client.get("/api/plans", headers=headers).json() == []


def test_plan_generation_requires_authentication(client: TestClient) -> None:
    response = client.post("/api/plans/generate", json={"profile": load_profile(), "durationWeeks": 4})
    assert response.status_code == 401


def test_google_login_creates_account(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_verify(_: str) -> dict[str, object]:
        return {
            "email": "google-user@example.com",
            "email_verified": True,
            "given_name": "Greta",
        }

    monkeypatch.setattr("app.api.auth.verify_google_credential", fake_verify)

    response = client.post("/api/auth/google", json={"credential": "fake-google-credential-token"})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["accessToken"]
    assert payload["user"]["email"] == "google-user@example.com"
    assert payload["user"]["firstName"] == "Greta"


def test_google_login_links_existing_email_account(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    register = client.post(
        "/api/auth/register",
        json={"email": "sam@example.com", "password": "very-secure-password", "firstName": "Sam"},
    )
    assert register.status_code == 201, register.text

    def fake_verify(_: str) -> dict[str, object]:
        return {
            "email": "SAM@example.com",
            "email_verified": True,
            "given_name": "Samuel",
        }

    monkeypatch.setattr("app.api.auth.verify_google_credential", fake_verify)

    response = client.post("/api/auth/google", json={"credential": "fake-google-credential-token"})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["user"]["email"] == "sam@example.com"
    assert payload["user"]["firstName"] == "Sam"


def test_plan_generation_returns_structured_safety_block(client: TestClient) -> None:
    headers = auth_headers(client)
    profile = load_profile()
    profile["health"]["safetyFlags"] = [{"id": "dizziness", "value": True}]

    response = client.post(
        "/api/plans/generate",
        headers=headers,
        json={"profile": profile, "durationWeeks": 4},
    )
    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "MEDICAL_CLEARANCE_REQUIRED"
    assert any("Schwindel" in notice for notice in detail["notices"])


def test_exercise_detail_is_public_and_includes_media(client: TestClient) -> None:
    response = client.get("/api/exercises/EX001213")  # Standard-Liegestütz
    assert response.status_code == 200, response.text
    detail = response.json()
    assert detail["name"] == "Liegestütz"
    assert detail["pattern"] == "Horizontal drücken"
    assert detail["equipment"]
    assert detail["cues"]
    assert detail["media"] is not None
    assert len(detail["media"]["images"]) == 2
    assert detail["media"]["images"][0].startswith("https://")
    assert "instructions" not in detail["media"]
    assert detail["media"]["attribution"]["license"].startswith("Unlicense")
    assert response.headers["cache-control"].startswith("public")


def test_exercise_detail_without_media_still_describes_exercise(client: TestClient) -> None:
    response = client.get("/api/exercises/ex000640")  # Bandrudern im Stand, keine Abbildung
    assert response.status_code == 200, response.text
    detail = response.json()
    assert detail["exerciseId"] == "EX000640"
    assert detail["media"] is None
    assert detail["cues"]


def test_unknown_exercise_returns_404(client: TestClient) -> None:
    assert client.get("/api/exercises/EX999999").status_code == 404
