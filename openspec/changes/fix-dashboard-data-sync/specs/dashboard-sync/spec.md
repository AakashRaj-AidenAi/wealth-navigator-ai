# Dashboard Data Synchronization Spec

## MODIFIED Requirements

### Requirement: Dashboard AUM Display

The dashboard SHALL display accurate Total AUM calculated from all clients.

#### Scenario: AUM calculation includes all clients
- **GIVEN** an authenticated user is on the dashboard
- **WHEN** the dashboard loads
- **THEN** Total AUM SHALL be calculated from ALL clients in the database
- **AND** the value SHALL match the sum visible on the Clients page

#### Scenario: AUM handles empty state
- **GIVEN** there are no clients in the database
- **WHEN** the dashboard loads
- **THEN** Total AUM SHALL display "$0"
- **AND** no error SHALL be thrown

### Requirement: Sidebar Dynamic Badges

The sidebar navigation badges SHALL reflect real-time database counts.

#### Scenario: Orders badge shows pending count
- **GIVEN** there are N orders with status "pending" in the database
- **WHEN** the sidebar renders
- **THEN** the Orders nav item badge SHALL display N
- **AND** if N is 0, no badge SHALL be displayed

#### Scenario: Compliance badge shows active alerts count
- **GIVEN** there are M unresolved compliance alerts
- **WHEN** the sidebar renders
- **THEN** the Compliance nav item badge SHALL display M
- **AND** if M is 0, no badge SHALL be displayed

#### Scenario: Badges update on data change
- **GIVEN** the user creates a new pending order
- **WHEN** the order is saved
- **THEN** the Orders badge SHALL increment by 1
- **AND** this update SHOULD occur within 5 seconds (polling acceptable)

### Requirement: Alerts Panel Navigation

The Active Alerts panel SHALL allow navigation to the Compliance page.

#### Scenario: View All button navigation
- **GIVEN** an authenticated user views the dashboard
- **WHEN** the user clicks "View All" in the Active Alerts panel
- **THEN** the user SHALL be navigated to `/compliance`
- **AND** the Alerts tab SHALL be active (default tab)

### Requirement: Compliance Alerts Consistency

The compliance alert count SHALL be consistent across dashboard and sidebar.

#### Scenario: Count matches compliance page
- **GIVEN** the ComplianceAlerts component shows N alerts
- **WHEN** the dashboard Active Alerts card displays a count
- **THEN** the dashboard count SHALL equal N
- **AND** the sidebar Compliance badge SHALL equal N

#### Scenario: Dynamic alert generation
- **GIVEN** a client's KYC expiry date passes
- **WHEN** the dashboard refreshes
- **THEN** the compliance alerts count SHALL include the newly expired KYC
- **AND** this SHALL be reflected in both dashboard and sidebar

## ADDED Requirements

### Requirement: Dashboard Stats Context

A shared context SHALL provide dashboard statistics to multiple components.

#### Scenario: Stats available in sidebar
- **GIVEN** the DashboardStatsContext is initialized
- **WHEN** the Sidebar component renders
- **THEN** it SHALL have access to pendingOrders, alertsCount, and other stats
- **AND** these values SHALL be current (fetched within last 30 seconds)

#### Scenario: Stats refresh on navigation
- **GIVEN** a user navigates from one page to another
- **WHEN** returning to the dashboard
- **THEN** the stats SHALL be refreshed
- **AND** any stale data SHALL be updated
