## 1. Floating Navigation

- [x] 1.1 Add `.floating-bar` utility class to `src/index.css` — glass morphism background (`bg-card/70 backdrop-blur-xl`), rounded corners (`rounded-2xl`), shadow, border (`border border-border/50`)
- [x] 1.2 Update `Sidebar.tsx` — changed to floating (`fixed left-3 top-3 bottom-3`) with `.floating-bar` treatment; replaced all `border-sidebar-border` with `border-border/30`
- [x] 1.3 Update `Header.tsx` — changed to floating (`floating-bar sticky top-0 z-30`) with glass morphism
- [x] 1.4 Update `MarketTicker.tsx` — modern non-scrolling design with floating card aesthetic, live indicator, evenly distributed quotes
- [x] 1.5 Update `MainLayout.tsx` — adjusted margins with `ml-[calc(256px+24px)]`/`ml-[calc(64px+24px)]`, wrapped header in `pt-3 pr-3`, ticker in `px-3 pt-2`
- [ ] 1.6 Verify all pages render correctly with the floating layout — check for overflow, z-index stacking, and scrolling behavior
