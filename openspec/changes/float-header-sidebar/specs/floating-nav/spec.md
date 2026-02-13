# Floating Navigation

## MODIFIED Requirements

### Requirement: Sidebar must appear as a floating bar
The sidebar must render as a floating element with visible gaps from the left, top, and bottom viewport edges. It uses glass morphism (semi-transparent background with backdrop blur), rounded corners, and a subtle drop shadow.

#### Scenario: Sidebar expanded floating
- Given the sidebar is in expanded state (w-64)
- Then it is positioned with a 12px gap from the left, top, and bottom edges
- And has rounded-2xl corners, glass background, and shadow

#### Scenario: Sidebar collapsed floating
- Given the sidebar is in collapsed state (w-16)
- Then the same floating treatment applies with the narrower width

### Requirement: Header must appear as a floating bar
The header must render as a floating element with visible gaps from the top and right edges, visually separated from the sidebar. Uses the same glass morphism, rounded corners, and shadow treatment.

#### Scenario: Header floating
- Given any page is loaded
- Then the header is displayed with rounded-2xl corners
- And has a 12px gap from the top of the content area and 12px from the right edge
- And uses glass background with backdrop blur

### Requirement: Market ticker matches floating aesthetic
The market ticker below the header must match the same floating card treatment or integrate seamlessly with the floating header.

#### Scenario: Ticker visible
- Given the ticker is expanded
- Then it renders as a floating bar below the header with matching style

### Requirement: Content area accounts for floating layout
The main content area must have proper spacing so it does not overlap or clip behind the floating sidebar or header.

#### Scenario: Page scrolling
- Given a page has more content than the viewport
- Then the content scrolls normally behind/under the floating header
- And the sidebar remains fixed and visible
