# Change: Enhance UI Layout and Copilot Experience

## Why
The current UI needs polish: the market ticker should be integrated into the header for a cleaner layout, the sidebar expand toggle overlaps content when collapsed, the AI copilot settings button is non-functional, and the landing page lacks dynamic contextual prompts and copilot branding ("Wealthyx").

## What Changes
- Merge live market ticker into the header as a second row (remove standalone MarketTicker)
- Fix sidebar collapse toggle overlap by positioning it as an absolute circular button on the sidebar edge
- Brand the AI copilot as "Wealthyx" with a gradient icon badge
- Add dynamic rotating input placeholders based on user role
- Add role-based prompt suggestions on the AI landing page
- Wire up the copilot Settings button to open a settings popover/dialog
- Apply modern glass-morphism and micro-interaction polish throughout

## Impact
- Affected specs: `ui-layout`, `ai-copilot`
- Affected code:
  - `src/components/layout/Header.tsx` — two-row floating header with ticker
  - `src/components/layout/Sidebar.tsx` — absolute toggle button
  - `src/components/layout/MainLayout.tsx` — remove MarketTicker import
  - `src/components/ai/AILandingPage.tsx` — Wealthyx branding, dynamic placeholders, suggestions
  - `src/components/ai/AICopilotPage.tsx` — Wealthyx branding, settings popover
  - `src/hooks/usePromptSuggestions.ts` — role-based suggestions
