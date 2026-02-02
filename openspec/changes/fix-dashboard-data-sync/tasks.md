# Implementation Tasks

## 1. Fix Dashboard AUM Query
- [x] 1.1 Modify `Index.tsx` to fetch clients without advisor_id filter OR with flexible filtering
- [x] 1.2 Add error logging if clients query returns empty to aid debugging
- [x] 1.3 Verify AUM displays correctly after change

## 2. Fix Alerts Panel "View All" Button
- [x] 2.1 Import `useNavigate` in `AlertsPanel.tsx`
- [x] 2.2 Add `onClick={() => navigate('/compliance')}` to View All button
- [x] 2.3 Verify navigation works correctly

## 3. Create Dashboard Stats Context
- [x] 3.1 Create `src/contexts/DashboardStatsContext.tsx` with stats state
- [x] 3.2 Move stats fetching logic from `Index.tsx` to context provider
- [x] 3.3 Export `useDashboardStats` hook for consuming components
- [x] 3.4 Wrap app with `DashboardStatsProvider` in `App.tsx` or `MainLayout.tsx`

## 4. Update Sidebar to Use Dynamic Badges
- [x] 4.1 Import `useDashboardStats` in `Sidebar.tsx`
- [x] 4.2 Remove hardcoded `badge` values from `mainNavItems` and `secondaryNavItems`
- [x] 4.3 Compute badge values dynamically from context:
  - Orders badge = `stats.pendingOrders`
  - Compliance badge = `stats.alertsCount`
  - Messages badge = fetch unread count (or 0 if not implemented)
- [x] 4.4 Verify badges update correctly

## 5. Sync Compliance Alerts Count
- [x] 5.1 Update dashboard to count compliance alerts using same logic as `ComplianceAlerts.tsx`
- [x] 5.2 Create shared utility `getComplianceAlertsCount()` that both components use
- [x] 5.3 Verify count matches between dashboard card and compliance page

## 6. Testing & Validation
- [x] 6.1 Test dashboard with multiple clients having different advisor_ids
- [x] 6.2 Test sidebar badges update when orders/alerts change
- [x] 6.3 Test "View All" navigation in AlertsPanel
- [x] 6.4 Test compliance count consistency
- [x] 6.5 Verify no console errors

## Dependencies
- Task 3 must complete before Task 4 (Sidebar needs context)
- Tasks 1, 2, 5 can run in parallel
- Task 6 depends on all other tasks
