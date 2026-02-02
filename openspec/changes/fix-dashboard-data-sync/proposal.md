# Fix Dashboard Data Synchronization

## Summary

The dashboard and sidebar display incorrect or missing data due to:
1. AUM showing $0 despite clients having assets
2. Hardcoded badge counts in sidebar navigation
3. Non-functional "View All" links for alerts
4. Compliance count mismatch between dashboard and actual data

## Problem Analysis

### 1. Total AUM Shows $0
- **Root Cause**: Dashboard query filters clients by `advisor_id = user.id`
- **Issue**: If clients were not created with the current user as advisor, they won't be counted
- **Solution**: Remove advisor filter OR ensure all clients are assigned to current advisor

### 2. Sidebar Badge Counts Are Hardcoded
- **Location**: `src/components/layout/Sidebar.tsx` lines 40, 42, 48
- **Issue**: Badge values are static constants (`badge: 3`, `badge: 2`, `badge: 5`)
- **Solution**: Fetch real counts from database and pass via context or props

### 3. Alerts "View All" Not Working
- **Location**: `src/components/dashboard/AlertsPanel.tsx` line 173
- **Issue**: Button has no `onClick` handler or navigation
- **Solution**: Add `onClick={() => navigate('/compliance')}` or Link wrapper

### 4. Compliance Count Incorrect
- **Location**: Dashboard queries `compliance_alerts` table with `is_resolved = false`
- **Issue**: The `compliance_alerts` table may be empty; alerts are generated dynamically in `ComplianceAlerts.tsx` from client KYC dates
- **Solution**: Use consistent alert generation logic or populate `compliance_alerts` table

## Proposed Changes

### Phase 1: Fix Data Queries
- Modify dashboard AUM query to fetch ALL clients (not filtered by advisor_id) OR ensure advisor assignment
- Update AlertsPanel "View All" button to navigate to /compliance

### Phase 2: Dynamic Sidebar Badges
- Create a SidebarContext or use existing AuthContext to share counts
- Fetch pending orders, unresolved compliance alerts, and unread messages counts
- Pass dynamic badge values to Sidebar component

### Phase 3: Sync Compliance Alerts
- Decide on source of truth: `compliance_alerts` table OR dynamic generation
- If using table, create background job/trigger to populate alerts from KYC expiry
- If using dynamic, update dashboard to use same logic as ComplianceAlerts component

## Files Affected

- `src/pages/Index.tsx` - Dashboard stats fetching
- `src/components/layout/Sidebar.tsx` - Hardcoded badges
- `src/components/dashboard/AlertsPanel.tsx` - View All button
- `src/components/layout/MainLayout.tsx` - Context provider (if new context needed)
- `src/contexts/DashboardContext.tsx` - New context for shared stats (optional)

## Out of Scope

- Real-time subscriptions for live badge updates
- Notification system for alerts
- Background jobs for alert population
