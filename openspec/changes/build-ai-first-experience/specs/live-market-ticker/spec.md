## ADDED Requirements

### Requirement: Live Market Ticker Bar
A slim scrolling ticker bar SHALL display below the header on all pages, showing live stock/index prices with real-time updates.

#### Scenario: Ticker bar displays market data
- **WHEN** the user is on any page
- **THEN** a slim bar below the header shows market symbols with their current price and change percentage
- **AND** symbols include configurable defaults: NIFTY 50, SENSEX, S&P 500, NASDAQ, Gold, USD/INR
- **AND** positive changes are shown in green, negative in red

#### Scenario: Market data auto-refreshes
- **WHEN** the ticker bar is visible
- **THEN** market data refreshes automatically every 60 seconds
- **AND** price updates animate briefly (flash green/red on change)
- **AND** stale data is served from React Query cache between refreshes

#### Scenario: User hides the ticker bar
- **WHEN** the user clicks the collapse/hide button on the ticker bar
- **THEN** the ticker bar collapses to zero height with a smooth transition
- **AND** the preference is saved in localStorage
- **AND** a small expand button remains visible to restore it

#### Scenario: Market data is unavailable
- **WHEN** the backend market API fails or returns an error
- **THEN** the ticker bar shows "Market data unavailable" in muted text
- **AND** the app continues to function normally without the ticker

### Requirement: Backend Market Data Proxy
The backend SHALL provide a `/api/v1/market/quotes` endpoint that proxies Yahoo Finance data to avoid CORS issues and enable caching.

#### Scenario: Frontend requests market quotes
- **WHEN** the frontend calls `GET /api/v1/market/quotes?symbols=^NSEI,^BSESN,^GSPC,^IXIC,GC=F,INR=X`
- **THEN** the backend fetches current prices from Yahoo Finance via `yfinance`
- **AND** returns an array of objects with `symbol`, `name`, `price`, `change`, `changePercent`, `currency`
- **AND** responses are cached for 60 seconds to minimize external API calls

#### Scenario: Yahoo Finance API is unreachable
- **WHEN** the backend cannot reach Yahoo Finance
- **THEN** it returns a 503 status with a descriptive error message
- **AND** previously cached data (if any) is returned with a `stale: true` flag
