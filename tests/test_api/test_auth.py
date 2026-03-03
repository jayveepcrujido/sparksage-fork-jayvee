import pytest
import os
import db

def test_login_success(client, monkeypatch):
    # Set a known admin password
    monkeypatch.setenv("ADMIN_PASSWORD", "test_password")
    
    payload = {"password": "test_password"}
    response = client.post("/api/auth/login", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_failure(client, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", "secret")
    
    payload = {"password": "wrong_password"}
    response = client.post("/api/auth/login", json=payload)
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid password"

def test_me_endpoint(client, monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", "password")
    
    # Login first
    login_resp = client.post("/api/auth/login", json={"password": "password"})
    token = login_resp.json()["access_token"]
    
    # Access /me
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert response.json()["role"] == "admin"
