import copy
import pytest
from fastapi.testclient import TestClient

import src.app as app_module


@pytest.fixture(autouse=True)
def restore_activities():
    """Backup and restore the in-memory activities dict for each test."""
    backup = copy.deepcopy(app_module.activities)
    yield
    app_module.activities = backup


client = TestClient(app_module.app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Known activity present
    assert "Chess Club" in data


def test_signup_and_duplicate_signup():
    email = "test.user@example.com"
    activity = "Chess Club"

    # Sign up should succeed
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert email in app_module.activities[activity]["participants"]

    # Duplicate signup should return 400
    resp2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp2.status_code == 400


def test_unregister_participant():
    email = "leave.user@example.com"
    activity = "Programming Class"

    # Ensure participant exists by signing up
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert email in app_module.activities[activity]["participants"]

    # Now unregister
    resp2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp2.status_code == 200
    assert email not in app_module.activities[activity]["participants"]


def test_signup_nonexistent_activity():
    resp = client.post("/activities/NoSuchActivity/signup?email=a@b.com")
    assert resp.status_code == 404


def test_unregister_nonexistent_participant():
    activity = "Chess Club"
    email = "no.one@nowhere.example"
    resp = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp.status_code == 404
from fastapi.testclient import TestClient
import copy
import pytest

from src import app as app_module

client = TestClient(app_module.app)


@pytest.fixture(autouse=True)
def restore_activities():
    # Backup and restore the in-memory activities to avoid test cross-talk
    backup = copy.deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(backup)


def test_get_activities():
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    # Expect at least one known activity
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "test.student@example.com"

    # Ensure email not already present
    assert email not in app_module.activities[activity]["participants"]

    # Signup
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert f"Signed up {email}" in resp.json().get("message", "")

    # Verify participant appears in GET
    resp2 = client.get("/activities")
    assert resp2.status_code == 200
    assert email in resp2.json()[activity]["participants"]

    # Duplicate signup should fail
    resp_dup = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp_dup.status_code == 400

    # Unregister
    resp_del = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp_del.status_code == 200
    assert f"Removed {email}" in resp_del.json().get("message", "")

    # Verify removed
    resp3 = client.get("/activities")
    assert email not in resp3.json()[activity]["participants"]


def test_signup_nonexistent_activity():
    resp = client.post("/activities/Nonexistent%20Activity/signup?email=a@b.com")
    assert resp.status_code == 404


def test_unregister_nonexistent_participant():
    activity = "Chess Club"
    email = "not.in.list@example.com"
    # Ensure not present
    if email in app_module.activities[activity]["participants"]:
        app_module.activities[activity]["participants"].remove(email)

    resp = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp.status_code == 404
