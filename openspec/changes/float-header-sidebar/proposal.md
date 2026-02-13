# Float Header & Sidebar

## Summary

Transform the header and sidebar from edge-attached elements into floating bars with rounded corners, glass morphism, subtle shadows, and a visible gap between them and the viewport edges. This creates a modern, premium "island" UI aesthetic similar to macOS menu bars and modern dashboard UIs.

## Motivation

The current header and sidebar are flush against the viewport edges with simple border separators. A floating design adds visual depth, a more modern aesthetic, and reinforces the premium positioning of the AidenAI wealth platform.

## Scope

- **Sidebar**: Add margin (gap from viewport top/left/bottom edges), rounded corners, glass background with blur, drop shadow, slight inset from the viewport
- **Header**: Add margin (gap from sidebar and top/right edges), rounded corners, glass background with blur, drop shadow
- **Market Ticker**: Float alongside or integrate below the floating header with matching style
- **MainLayout**: Adjust the overall layout to accommodate floating elements with proper spacing
- **Background**: The page background becomes visible through the gaps, creating the floating effect

## Affected Files

1. `src/components/layout/Sidebar.tsx` — floating styles
2. `src/components/layout/Header.tsx` — floating styles
3. `src/components/layout/MarketTicker.tsx` — matching floating style
4. `src/components/layout/MainLayout.tsx` — layout gap adjustments
5. `src/index.css` — optional: utility class `.floating-bar` for shared glass/shadow treatment

## Out of Scope

- No functional changes to navigation, links, or interactions
- No changes to page content layout
- No backend changes
