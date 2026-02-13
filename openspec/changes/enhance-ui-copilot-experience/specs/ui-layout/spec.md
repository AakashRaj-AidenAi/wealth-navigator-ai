## MODIFIED Requirements

### Requirement: Floating Header with Integrated Market Ticker
The header component SHALL render as a floating bar with glass-morphism styling and SHALL include a collapsible second row displaying live market quotes (symbol, price, change %).

#### Scenario: Header renders with ticker expanded
- **WHEN** the user has not collapsed the ticker
- **THEN** the header displays two rows: breadcrumbs/actions on top, market data on bottom
- **AND** a live indicator dot and collapse chevron are visible

#### Scenario: Header ticker collapsed
- **WHEN** the user collapses the ticker
- **THEN** only the breadcrumbs/actions row is shown
- **AND** a small "Markets" pill appears to re-expand the ticker

#### Scenario: Ticker collapse state persists
- **WHEN** the user collapses or expands the ticker
- **THEN** the preference is stored in localStorage under `wealthos-ticker-collapsed`

### Requirement: Sidebar Collapse Toggle
The sidebar collapse/expand toggle SHALL be positioned as an absolute circular button on the sidebar's right edge so it does not overlap content when the sidebar is collapsed.

#### Scenario: Collapsed sidebar toggle visible
- **WHEN** the sidebar is collapsed (64px width)
- **THEN** a small circular button with PanelLeftOpen icon appears at the right edge of the sidebar
- **AND** clicking it expands the sidebar

#### Scenario: Expanded sidebar toggle visible
- **WHEN** the sidebar is expanded (256px width)
- **THEN** a PanelLeftClose icon button appears in the header area
- **AND** clicking it collapses the sidebar

## ADDED Requirements

### Requirement: MainLayout without standalone MarketTicker
The MainLayout SHALL NOT render a standalone MarketTicker component. Market data is provided solely by the Header's integrated ticker row.

#### Scenario: No duplicate ticker
- **WHEN** the application renders
- **THEN** market data appears only in the header, not as a separate bar
