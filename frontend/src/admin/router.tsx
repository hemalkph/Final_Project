import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ModulePlaceholder } from '@/components/module-placeholder';
import { enabledNavItems } from '@/lib/nav-config';
import { PropertiesPage } from '@/features/properties/PropertiesPage';
import { AgentsPage } from '@/features/agents/AgentsPage';
import { PendingListingsPage } from '@/features/pending-listings/PendingListingsPage';
import { SellerApplicationsPage } from '@/features/seller-applications/SellerApplicationsPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { MessagesPage } from '@/features/messages/MessagesPage';
import { UsersPage } from '@/features/users/UsersPage';
import { LocationsPage } from '@/features/locations/LocationsPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { VerificationFraudPage } from '@/features/verification-fraud/VerificationFraudPage';

// Nav item id -> real page component, filled in phase by phase. Anything
// not listed here still falls back to ModulePlaceholder (see Phase 0).
const MODULE_PAGES: Partial<Record<string, ComponentType>> = {
  dashboard: DashboardPage,
  properties: PropertiesPage,
  agents: AgentsPage,
  'pending-listings': PendingListingsPage,
  'seller-applications': SellerApplicationsPage,
  messages: MessagesPage,
  users: UsersPage,
  locations: LocationsPage,
  analytics: AnalyticsPage,
  'verification-fraud': VerificationFraudPage,
};

const moduleRoutes: RouteObject[] = enabledNavItems.map((item) => {
  const Page = MODULE_PAGES[item.id] ?? (() => <ModulePlaceholder title={item.label} />);
  return item.path === '/'
    ? { index: true, element: <Page /> }
    : { path: item.path.slice(1), element: <Page /> };
});

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AdminLayout />,
      children: moduleRoutes,
    },
  ],
  {
    // Mounted at admin-dashboard.html (not a clean SPA root), so the
    // router needs this as its base path. server.js has a matching
    // SPA-fallback route for sub-paths under this basename (Phase 6).
    basename: '/admin-dashboard.html',
  },
);
