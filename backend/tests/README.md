# WealthOS Backend API Tests

Comprehensive test suite for the WealthOS FastAPI backend, covering authentication, client CRUD operations, and advisor scoping.

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures and test database configuration
├── test_api/
│   ├── __init__.py
│   ├── test_auth.py         # Authentication endpoint tests
│   └── test_clients.py      # Client CRUD endpoint tests
└── README.md                # This file
```

## Test Coverage

### Authentication Tests (`test_api/test_auth.py`)

Tests for user authentication endpoints at `/api/v1/auth/`:

- **Registration (`/register`)**
  - Successful registration with valid data
  - Duplicate email rejection (409 Conflict)
  - Weak password validation
  - Invalid email format validation
  - Missing required fields validation
  - Custom role assignment

- **Login (`/login`)**
  - Successful login with correct credentials
  - Wrong password rejection (401 Unauthorized)
  - Non-existent user rejection
  - Missing fields validation

- **Token Refresh (`/refresh`)**
  - Successful token refresh with valid refresh token
  - Invalid refresh token rejection
  - Access token rejection (must use refresh token)
  - Missing token validation

- **Logout (`/logout`)**
  - Successful logout with valid token
  - Logout without authentication

- **Current User Profile (`/me`)**
  - Successful profile retrieval
  - Access without token rejection
  - Invalid token rejection

- **Protected Routes**
  - Access without token
  - Access with valid token
  - Access with invalid token
  - Malformed authorization header

### Client CRUD Tests (`test_api/test_clients.py`)

Tests for client management endpoints at `/api/v1/clients/`:

- **Create Client (`POST /`)**
  - Successful client creation with full data
  - Minimal client creation (only required fields)
  - Creation without authentication
  - Missing required fields validation
  - Invalid data types validation

- **List Clients (`GET /`)**
  - Empty list when no clients exist
  - List with multiple clients
  - Pagination support (page, limit)
  - Search filter by client name
  - Filter by risk profile
  - Filter by active status

- **Get Client (`GET /{client_id}`)**
  - Successful retrieval by ID
  - Non-existent client (404 Not Found)
  - Invalid UUID format validation

- **Update Client (`PUT /{client_id}`)**
  - Successful full update
  - Partial field update
  - Non-existent client update
  - Empty update data handling

- **Delete Client (`DELETE /{client_id}`)**
  - Successful deletion (204 No Content)
  - Non-existent client deletion
  - Verification of deletion

### Advisor Scoping Tests

Critical security tests ensuring data isolation between advisors:

- Advisor cannot view other advisors' clients
- Advisor cannot update other advisors' clients
- Advisor cannot delete other advisors' clients
- Client list only shows advisor's own clients
- Multi-advisor scenarios with proper isolation

## Running Tests

### Prerequisites

```bash
# Install dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio httpx

# Ensure PostgreSQL is running (or use SQLite for tests)
```

### Run All Tests

```bash
# From the backend directory
pytest

# With verbose output
pytest -v

# With coverage report
pytest --cov=app --cov-report=html
```

### Run Specific Test Files

```bash
# Run only authentication tests
pytest tests/test_api/test_auth.py

# Run only client CRUD tests
pytest tests/test_api/test_clients.py
```

### Run Specific Test Classes or Methods

```bash
# Run a specific test class
pytest tests/test_api/test_auth.py::TestRegister

# Run a specific test method
pytest tests/test_api/test_auth.py::TestRegister::test_register_success

# Run tests matching a pattern
pytest -k "test_register"
```

### Run with Different Output Modes

```bash
# Show print statements
pytest -s

# Stop on first failure
pytest -x

# Show detailed test output
pytest -vv

# Show test durations
pytest --durations=10
```

## Test Database

The test suite uses an isolated test database configured in `conftest.py`:

- **Default**: SQLite in-memory database (`sqlite+aiosqlite:///./test.db`)
- **Isolation**: Each test gets a fresh database with all tables created
- **Cleanup**: Tables are dropped after each test
- **Performance**: SQLite provides fast test execution

### Using PostgreSQL for Tests

To use PostgreSQL instead of SQLite for tests, modify `conftest.py`:

```python
TEST_DATABASE_URL = "postgresql+asyncpg://user:pass@localhost:5432/wealthos_test"
```

## Test Fixtures

### Global Fixtures (`conftest.py`)

- `event_loop`: Session-scoped event loop for async tests
- `setup_database`: Auto-used fixture that creates/drops tables
- `db_session`: Test-scoped database session with rollback
- `client`: HTTPX AsyncClient wired to FastAPI app
- `authenticated_client`: Pre-authenticated test client

### Test-Specific Fixtures

#### Authentication Tests
- `client`: HTTPX client for API calls
- `registered_user`: Pre-registered user with tokens

#### Client Tests
- `client`: HTTPX client for API calls
- `auth_headers`: Pre-authenticated advisor headers
- `sample_client_data`: Sample client data for testing

## Writing New Tests

### Test Naming Convention

- Test files: `test_*.py`
- Test classes: `Test*` (e.g., `TestClientCRUD`)
- Test methods: `test_*` (e.g., `test_create_client_success`)

### Example Test Structure

```python
import pytest
from httpx import AsyncClient

class TestMyFeature:
    """Tests for my feature."""

    async def test_success_case(self, client: AsyncClient, auth_headers):
        """Test successful operation."""
        response = await client.post("/api/v1/endpoint",
                                    json={"data": "value"},
                                    headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["field"] == "expected"

    async def test_error_case(self, client: AsyncClient):
        """Test error handling."""
        response = await client.post("/api/v1/endpoint", json={})
        assert response.status_code == 422
```

### Best Practices

1. **Descriptive test names**: Use clear, descriptive names that explain what is being tested
2. **One assertion per test**: Focus each test on a single behavior
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
4. **Use fixtures**: Leverage pytest fixtures for common setup
5. **Clean up**: Ensure tests clean up after themselves (handled by fixtures)
6. **Test isolation**: Tests should not depend on each other
7. **Test both success and failure**: Cover happy paths and error cases

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    pytest --cov=app --cov-report=xml

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Debugging Tests

### Run with PDB Debugger

```bash
# Drop into debugger on failure
pytest --pdb

# Drop into debugger at start of test
pytest --trace
```

### Show SQL Queries

Modify `conftest.py` to enable SQL logging:

```python
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=True,  # Enable SQL query logging
)
```

### Verbose Assertion Output

```bash
# Show full assertion output
pytest -vv --tb=short
```

## Troubleshooting

### Common Issues

1. **Import errors**: Ensure PYTHONPATH includes the backend directory
   ```bash
   export PYTHONPATH="${PYTHONPATH}:$(pwd)"
   ```

2. **Async warnings**: Ensure `pytest-asyncio` is installed and configured
   ```bash
   pip install pytest-asyncio
   ```

3. **Database connection errors**: Check database URL and credentials

4. **Port conflicts**: Ensure test server ports are available

### Getting Help

- Check test output with `-vv` flag for detailed information
- Review `conftest.py` for fixture configuration
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Verify database connectivity before running tests

## Test Metrics

Track test metrics to ensure quality:

- **Coverage Target**: Aim for >80% code coverage
- **Test Count**: Currently ~50+ tests
- **Execution Time**: Should complete in <30 seconds
- **Flakiness**: Zero flaky tests (consistent pass/fail)

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass: `pytest`
3. Check coverage: `pytest --cov=app`
4. Update this README if adding new test categories
5. Follow existing test patterns and conventions
