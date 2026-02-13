## ADDED Requirements

### Requirement: Copilot Branding as Wealthyx
The AI copilot SHALL be branded as "Wealthyx" with a gradient Bot icon badge on the landing page and in the copilot empty state.

#### Scenario: Landing page branding
- **WHEN** the user visits the home page
- **THEN** a "Wealthyx" logo with gradient Bot icon and bold text is displayed above the greeting

#### Scenario: Copilot empty state branding
- **WHEN** the user opens the copilot with no active conversation
- **THEN** a "Welcome to Wealthyx" heading with the gradient Bot icon is displayed

### Requirement: Dynamic Role-Based Placeholders
The landing page input SHALL display rotating placeholder text tailored to the user's role (wealth_advisor, compliance_officer, client) with a smooth fade transition every 3 seconds.

#### Scenario: Wealth advisor sees advisor-specific placeholders
- **WHEN** a user with role `wealth_advisor` views the landing page
- **THEN** the input placeholder cycles through advisor-relevant prompts (e.g., "Analyze my top 5 clients by AUM...")

#### Scenario: Compliance officer sees compliance-specific placeholders
- **WHEN** a user with role `compliance_officer` views the landing page
- **THEN** the input placeholder cycles through compliance prompts (e.g., "Show all unresolved compliance alerts...")

### Requirement: Role-Based Prompt Suggestions
The landing page SHALL display up to 6 clickable prompt suggestion chips sourced from the usePromptSuggestions hook, filtered by the user's role and contextual data.

#### Scenario: Suggestions displayed
- **WHEN** the landing page loads and suggestions are available
- **THEN** up to 6 prompt chips are shown below the input
- **AND** clicking a chip navigates to the copilot with that prompt pre-filled

### Requirement: Copilot Settings Popover
The copilot page header SHALL include a functional Settings button that opens a popover with agent preferences (response verbosity, default agent type, voice input toggle).

#### Scenario: Settings button opens popover
- **WHEN** the user clicks the Settings gear icon in the copilot header
- **THEN** a popover opens with preference controls

#### Scenario: Preferences are persisted
- **WHEN** the user changes a preference in the settings popover
- **THEN** the preference is stored in localStorage and applied immediately
