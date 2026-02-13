"""Tests for client CRUD endpoints with advisor scoping."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine


@pytest.fixture(autouse=True)
async def setup_db():
    """Create tables before tests, drop after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    """Provide an HTTPX AsyncClient for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def auth_headers(client: AsyncClient):
    """Register an advisor and return auth headers."""
    resp = await client.post("/api/v1/auth/register", json={
        "email": "advisor1@example.com",
        "password": "TestPass123!",
        "full_name": "Advisor One",
    })
    token = resp.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def sample_client_data():
    """Provide sample client data for testing."""
    return {
        "client_name": "Rajesh Kumar",
        "email": "rajesh@example.com",
        "phone": "+919876543210",
        "risk_profile": "moderate",
        "client_type": "individual",
        "total_assets": 5000000.0,
        "city": "Mumbai",
        "state": "Maharashtra",
        "occupation": "Software Engineer",
        "annual_income": 2000000.0,
    }


class TestClientCRUD:
    """Tests for basic client CRUD operations."""

    async def test_create_client_success(self, client: AsyncClient, auth_headers, sample_client_data):
        """Test successful client creation."""
        response = await client.post("/api/v1/clients/", json=sample_client_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["client_name"] == "Rajesh Kumar"
        assert data["email"] == "rajesh@example.com"
        assert data["risk_profile"] == "moderate"
        assert "id" in data
        assert "advisor_id" in data
        assert data["is_active"] is True
        assert data["onboarding_completed"] is False
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_client_minimal_data(self, client: AsyncClient, auth_headers):
        """Test creating a client with only required fields."""
        response = await client.post("/api/v1/clients/", json={
            "client_name": "Minimal Client",
        }, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["client_name"] == "Minimal Client"
        assert data["email"] is None
        assert data["phone"] is None

    async def test_create_client_without_auth(self, client: AsyncClient, sample_client_data):
        """Test creating a client without authentication."""
        response = await client.post("/api/v1/clients/", json=sample_client_data)
        assert response.status_code == 401

    async def test_create_client_missing_required_field(self, client: AsyncClient, auth_headers):
        """Test creating a client without required client_name."""
        response = await client.post("/api/v1/clients/", json={
            "email": "test@example.com",
        }, headers=auth_headers)
        assert response.status_code == 422

    async def test_list_clients_empty(self, client: AsyncClient, auth_headers):
        """Test listing clients when none exist."""
        response = await client.get("/api/v1/clients/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_clients_with_data(self, client: AsyncClient, auth_headers, sample_client_data):
        """Test listing clients after creating some."""
        # Create multiple clients
        await client.post("/api/v1/clients/", json=sample_client_data, headers=auth_headers)
        await client.post("/api/v1/clients/", json={
            "client_name": "Priya Sharma",
            "email": "priya@example.com",
        }, headers=auth_headers)

        response = await client.get("/api/v1/clients/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 2
        assert data["page"] == 1
        assert data["limit"] == 20

    async def test_list_clients_pagination(self, client: AsyncClient, auth_headers):
        """Test client list pagination."""
        # Create 5 clients
        for i in range(5):
            await client.post("/api/v1/clients/", json={
                "client_name": f"Client {i}",
            }, headers=auth_headers)

        # Test first page with limit 2
        response = await client.get("/api/v1/clients/?page=1&limit=2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["limit"] == 2

        # Test second page
        response = await client.get("/api/v1/clients/?page=2&limit=2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["page"] == 2

    async def test_list_clients_search(self, client: AsyncClient, auth_headers):
        """Test client list with search filter."""
        # Create clients with different names
        await client.post("/api/v1/clients/", json={
            "client_name": "Rajesh Kumar",
        }, headers=auth_headers)
        await client.post("/api/v1/clients/", json={
            "client_name": "Priya Sharma",
        }, headers=auth_headers)

        # Search for "Rajesh"
        response = await client.get("/api/v1/clients/?search=Rajesh", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1
        assert any("Rajesh" in item["client_name"] for item in data["items"])

    async def test_list_clients_filter_risk_profile(self, client: AsyncClient, auth_headers):
        """Test filtering clients by risk profile."""
        # Create clients with different risk profiles
        await client.post("/api/v1/clients/", json={
            "client_name": "Conservative Client",
            "risk_profile": "conservative",
        }, headers=auth_headers)
        await client.post("/api/v1/clients/", json={
            "client_name": "Aggressive Client",
            "risk_profile": "aggressive",
        }, headers=auth_headers)

        # Filter by conservative
        response = await client.get("/api/v1/clients/?risk_profile=conservative", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(item["risk_profile"] == "conservative" for item in data["items"])

    async def test_get_client_by_id(self, client: AsyncClient, auth_headers, sample_client_data):
        """Test retrieving a specific client by ID."""
        # Create a client
        create_resp = await client.post("/api/v1/clients/", json=sample_client_data, headers=auth_headers)
        client_id = create_resp.json().get("id")

        # Get the client
        response = await client.get(f"/api/v1/clients/{client_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == client_id
        assert data["client_name"] == "Rajesh Kumar"
        assert data["email"] == "rajesh@example.com"

    async def test_get_client_not_found(self, client: AsyncClient, auth_headers):
        """Test retrieving a non-existent client."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/clients/{fake_uuid}", headers=auth_headers)
        assert response.status_code == 404

    async def test_get_client_invalid_uuid(self, client: AsyncClient, auth_headers):
        """Test retrieving a client with invalid UUID."""
        response = await client.get("/api/v1/clients/not-a-uuid", headers=auth_headers)
        assert response.status_code == 422

    async def test_update_client_success(self, client: AsyncClient, auth_headers, sample_client_data):
        """Test successfully updating a client."""
        # Create a client
        create_resp = await client.post("/api/v1/clients/", json=sample_client_data, headers=auth_headers)
        client_id = create_resp.json().get("id")

        # Update the client
        update_data = {
            "client_name": "Raj Kumar",
            "phone": "+919999999999",
            "risk_profile": "aggressive",
        }
        response = await client.put(
            f"/api/v1/clients/{client_id}",
            json=update_data,
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["client_name"] == "Raj Kumar"
        assert data["phone"] == "+919999999999"
        assert data["risk_profile"] == "aggressive"
        # Verify email wasn't changed (not in update)
        assert data["email"] == "rajesh@example.com"

    async def test_update_client_partial(self, client: AsyncClient, auth_headers, sample_client_data):
        """Test partial update of client fields."""
        # Create a client
        create_resp = await client.post("/api/v1/clients/", json=sample_client_data, headers=auth_headers)
        client_id = create_resp.json().get("id")

        # Update only one field
        response = await client.put(
            f"/api/v1/clients/{client_id}",
            json={"city": "Delhi"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["city"] == "Delhi"
        # Other fields should remain unchanged
        assert data["client_name"] == "Rajesh Kumar"

    async def test_update_client_not_found(self, client: AsyncClient, auth_headers):
        """Test updating a non-existent client."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = await client.put(
            f"/api/v1/clients/{fake_uuid}",
            json={"client_name": "Updated Name"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    async def test_delete_client_success(self, client: AsyncClient, auth_headers, sample_client_data):
        """Test successfully deleting a client."""
        # Create a client
        create_resp = await client.post("/api/v1/clients/", json=sample_client_data, headers=auth_headers)
        client_id = create_resp.json().get("id")

        # Delete the client
        response = await client.delete(f"/api/v1/clients/{client_id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify it's deleted
        get_response = await client.get(f"/api/v1/clients/{client_id}", headers=auth_headers)
        assert get_response.status_code == 404

    async def test_delete_client_not_found(self, client: AsyncClient, auth_headers):
        """Test deleting a non-existent client."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(f"/api/v1/clients/{fake_uuid}", headers=auth_headers)
        assert response.status_code == 404


class TestAdvisorScoping:
    """Tests for advisor-scoped client access."""

    async def test_advisor_cannot_see_other_advisors_clients(self, client: AsyncClient, sample_client_data):
        """Test that advisors can only see their own clients."""
        # Register advisor 1
        resp1 = await client.post("/api/v1/auth/register", json={
            "email": "advisor1@test.com",
            "password": "TestPass123!",
            "full_name": "Advisor 1",
        })
        headers1 = {"Authorization": f"Bearer {resp1.json()['access_token']}"}

        # Register advisor 2
        resp2 = await client.post("/api/v1/auth/register", json={
            "email": "advisor2@test.com",
            "password": "TestPass123!",
            "full_name": "Advisor 2",
        })
        headers2 = {"Authorization": f"Bearer {resp2.json()['access_token']}"}

        # Advisor 1 creates a client
        create_resp = await client.post("/api/v1/clients/", json=sample_client_data, headers=headers1)
        client_id = create_resp.json().get("id")

        # Advisor 2 should not see advisor 1's client
        response = await client.get(f"/api/v1/clients/{client_id}", headers=headers2)
        assert response.status_code == 404

    async def test_advisor_cannot_update_other_advisors_clients(self, client: AsyncClient, sample_client_data):
        """Test that advisors cannot update other advisors' clients."""
        # Register advisor 1
        resp1 = await client.post("/api/v1/auth/register", json={
            "email": "advisor1@test.com",
            "password": "TestPass123!",
            "full_name": "Advisor 1",
        })
        headers1 = {"Authorization": f"Bearer {resp1.json()['access_token']}"}

        # Register advisor 2
        resp2 = await client.post("/api/v1/auth/register", json={
            "email": "advisor2@test.com",
            "password": "TestPass123!",
            "full_name": "Advisor 2",
        })
        headers2 = {"Authorization": f"Bearer {resp2.json()['access_token']}"}

        # Advisor 1 creates a client
        create_resp = await client.post("/api/v1/clients/", json=sample_client_data, headers=headers1)
        client_id = create_resp.json().get("id")

        # Advisor 2 should not be able to update advisor 1's client
        response = await client.put(
            f"/api/v1/clients/{client_id}",
            json={"client_name": "Hacked Name"},
            headers=headers2,
        )
        assert response.status_code == 404

    async def test_advisor_cannot_delete_other_advisors_clients(self, client: AsyncClient, sample_client_data):
        """Test that advisors cannot delete other advisors' clients."""
        # Register advisor 1
        resp1 = await client.post("/api/v1/auth/register", json={
            "email": "advisor1@test.com",
            "password": "TestPass123!",
            "full_name": "Advisor 1",
        })
        headers1 = {"Authorization": f"Bearer {resp1.json()['access_token']}"}

        # Register advisor 2
        resp2 = await client.post("/api/v1/auth/register", json={
            "email": "advisor2@test.com",
            "password": "TestPass123!",
            "full_name": "Advisor 2",
        })
        headers2 = {"Authorization": f"Bearer {resp2.json()['access_token']}"}

        # Advisor 1 creates a client
        create_resp = await client.post("/api/v1/clients/", json=sample_client_data, headers=headers1)
        client_id = create_resp.json().get("id")

        # Advisor 2 should not be able to delete advisor 1's client
        response = await client.delete(f"/api/v1/clients/{client_id}", headers=headers2)
        assert response.status_code == 404

        # Verify the client still exists for advisor 1
        get_response = await client.get(f"/api/v1/clients/{client_id}", headers=headers1)
        assert get_response.status_code == 200

    async def test_advisor_list_only_shows_own_clients(self, client: AsyncClient):
        """Test that client list only returns the advisor's own clients."""
        # Register advisor 1
        resp1 = await client.post("/api/v1/auth/register", json={
            "email": "advisor1@test.com",
            "password": "TestPass123!",
            "full_name": "Advisor 1",
        })
        headers1 = {"Authorization": f"Bearer {resp1.json()['access_token']}"}

        # Register advisor 2
        resp2 = await client.post("/api/v1/auth/register", json={
            "email": "advisor2@test.com",
            "password": "TestPass123!",
            "full_name": "Advisor 2",
        })
        headers2 = {"Authorization": f"Bearer {resp2.json()['access_token']}"}

        # Advisor 1 creates 2 clients
        await client.post("/api/v1/clients/", json={"client_name": "Client A1"}, headers=headers1)
        await client.post("/api/v1/clients/", json={"client_name": "Client A2"}, headers=headers1)

        # Advisor 2 creates 3 clients
        await client.post("/api/v1/clients/", json={"client_name": "Client B1"}, headers=headers2)
        await client.post("/api/v1/clients/", json={"client_name": "Client B2"}, headers=headers2)
        await client.post("/api/v1/clients/", json={"client_name": "Client B3"}, headers=headers2)

        # Advisor 1 should only see their 2 clients
        response1 = await client.get("/api/v1/clients/", headers=headers1)
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["total"] == 2
        assert len(data1["items"]) == 2

        # Advisor 2 should only see their 3 clients
        response2 = await client.get("/api/v1/clients/", headers=headers2)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["total"] == 3
        assert len(data2["items"]) == 3


class TestClientValidation:
    """Tests for client data validation."""

    async def test_create_client_with_invalid_data_types(self, client: AsyncClient, auth_headers):
        """Test creating a client with invalid data types."""
        response = await client.post("/api/v1/clients/", json={
            "client_name": "Test Client",
            "total_assets": "not-a-number",  # Should be float
        }, headers=auth_headers)
        assert response.status_code == 422

    async def test_update_client_with_empty_data(self, client: AsyncClient, auth_headers):
        """Test updating a client with empty update data."""
        # Create a client
        create_resp = await client.post("/api/v1/clients/", json={
            "client_name": "Test Client",
        }, headers=auth_headers)
        client_id = create_resp.json().get("id")

        # Update with empty data
        response = await client.put(
            f"/api/v1/clients/{client_id}",
            json={},
            headers=auth_headers,
        )
        # Should still succeed (no changes)
        assert response.status_code == 200
