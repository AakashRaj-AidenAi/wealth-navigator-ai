"""Tests for authentication endpoints."""
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
async def registered_user(client: AsyncClient):
    """Register a test user and return credentials."""
    response = await client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "TestPass123!",
        "full_name": "Test User",
    })
    return response.json()


class TestRegister:
    """Tests for the user registration endpoint."""

    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "new@example.com",
            "password": "StrongPass1!",
            "full_name": "New User",
        })
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "new@example.com"
        assert data["user"]["full_name"] == "New User"
        assert data["user"]["role"] == "wealth_advisor"
        assert data["user"]["is_active"] is True

    async def test_register_duplicate_email(self, client: AsyncClient, registered_user):
        """Test registration with an already registered email."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": "AnotherPass1!",
            "full_name": "Duplicate",
        })
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"].lower()

    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with password too short."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "weak@example.com",
            "password": "123",
            "full_name": "Weak",
        })
        assert response.status_code == 422

    async def test_register_invalid_email(self, client: AsyncClient):
        """Test registration with invalid email format."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "not-an-email",
            "password": "StrongPass1!",
            "full_name": "Invalid Email",
        })
        assert response.status_code == 422

    async def test_register_missing_fields(self, client: AsyncClient):
        """Test registration with missing required fields."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "incomplete@example.com",
        })
        assert response.status_code == 422

    async def test_register_custom_role(self, client: AsyncClient):
        """Test registration with a custom role."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "admin@example.com",
            "password": "AdminPass1!",
            "full_name": "Admin User",
            "role": "admin",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["user"]["role"] == "admin"


class TestLogin:
    """Tests for the login endpoint."""

    async def test_login_success(self, client: AsyncClient, registered_user):
        """Test successful login with correct credentials."""
        response = await client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "TestPass123!",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "test@example.com"

    async def test_login_wrong_password(self, client: AsyncClient, registered_user):
        """Test login with incorrect password."""
        response = await client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "WrongPass",
        })
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user email."""
        response = await client.post("/api/v1/auth/login", json={
            "email": "nobody@example.com",
            "password": "SomePass1!",
        })
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    async def test_login_missing_fields(self, client: AsyncClient):
        """Test login with missing required fields."""
        response = await client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
        })
        assert response.status_code == 422


class TestProtectedRoute:
    """Tests for accessing protected routes with and without authentication."""

    async def test_access_without_token(self, client: AsyncClient):
        """Test accessing a protected route without authentication token."""
        response = await client.get("/api/v1/clients/")
        assert response.status_code == 401

    async def test_access_with_valid_token(self, client: AsyncClient, registered_user):
        """Test accessing a protected route with valid token."""
        token = registered_user.get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/api/v1/clients/", headers=headers)
        assert response.status_code == 200

    async def test_access_with_invalid_token(self, client: AsyncClient):
        """Test accessing a protected route with an invalid token."""
        headers = {"Authorization": "Bearer invalid-token-here"}
        response = await client.get("/api/v1/clients/", headers=headers)
        assert response.status_code == 401

    async def test_access_with_malformed_header(self, client: AsyncClient):
        """Test accessing a protected route with malformed auth header."""
        headers = {"Authorization": "NotBearer token"}
        response = await client.get("/api/v1/clients/", headers=headers)
        assert response.status_code == 401


class TestRefresh:
    """Tests for the token refresh endpoint."""

    async def test_refresh_token_success(self, client: AsyncClient, registered_user):
        """Test successfully refreshing an access token."""
        refresh_token = registered_user.get("refresh_token")
        response = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        # Verify new tokens are different from the original
        assert data["access_token"] != registered_user.get("access_token")

    async def test_refresh_with_invalid_token(self, client: AsyncClient):
        """Test refreshing with an invalid refresh token."""
        response = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid-token-here",
        })
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    async def test_refresh_with_access_token(self, client: AsyncClient, registered_user):
        """Test that access tokens cannot be used for refresh."""
        access_token = registered_user.get("access_token")
        response = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": access_token,
        })
        assert response.status_code == 401

    async def test_refresh_missing_token(self, client: AsyncClient):
        """Test refresh endpoint with missing token."""
        response = await client.post("/api/v1/auth/refresh", json={})
        assert response.status_code == 422


class TestLogout:
    """Tests for the logout endpoint."""

    async def test_logout_success(self, client: AsyncClient, registered_user):
        """Test successful logout (stateless placeholder)."""
        token = registered_user.get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 200
        assert "detail" in response.json()

    async def test_logout_without_token(self, client: AsyncClient):
        """Test logout without authentication."""
        response = await client.post("/api/v1/auth/logout")
        assert response.status_code == 401


class TestMe:
    """Tests for the current user profile endpoint."""

    async def test_me_success(self, client: AsyncClient, registered_user):
        """Test retrieving current user profile."""
        token = registered_user.get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
        assert data["role"] == "wealth_advisor"
        assert "id" in data
        assert "created_at" in data

    async def test_me_without_token(self, client: AsyncClient):
        """Test accessing /me without authentication."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_me_with_invalid_token(self, client: AsyncClient):
        """Test accessing /me with invalid token."""
        headers = {"Authorization": "Bearer invalid-token"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401
