## 1. Header & Ticker Integration
- [x] 1.1 Merge market ticker into Header.tsx as a collapsible second row
- [x] 1.2 Remove standalone MarketTicker from MainLayout.tsx
- [x] 1.3 Add live indicator, quote symbols, price, and change % in header ticker row
- [x] 1.4 Add collapse/expand toggle for the ticker row with localStorage persistence

## 2. Sidebar Overlap Fix
- [x] 2.1 Position collapse toggle as absolute circular button on sidebar edge (`-right-3`)
- [x] 2.2 Ensure the toggle is visible and clickable in both expanded and collapsed states

## 3. Copilot Branding & Landing Page
- [x] 3.1 Name the copilot "Wealthyx" with Bot icon in a gradient badge
- [x] 3.2 Add dynamic rotating placeholders based on user role (wealth_advisor, compliance_officer, client)
- [x] 3.3 Add role-based prompt suggestions via usePromptSuggestions hook (limit to 6)
- [x] 3.4 Update AICopilotPage with Wealthyx branding in empty state and input placeholder

## 4. Copilot Settings
- [x] 4.1 Create a settings popover for the copilot Settings button (agent preferences, response length, voice toggle)
- [x] 4.2 Wire the Settings button in AICopilotPage header to open the popover

## 5. Verification
- [x] 5.1 TypeScript type-check passes (`npx tsc --noEmit`)
- [x] 5.2 Production build succeeds (`npm run build`)
