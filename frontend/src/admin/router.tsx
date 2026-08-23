import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ModulePlaceholder } from '@/components/module-placeholder';
import { enabledNavItems } from '@/lib/nav-config';
import { PropertiesPage } from '@/features/properties/PropertiesPage';
import { AgentsPage } from '@/features/agents/AgentsPage';
import { PendingListingsPage } from '@/features/pending-listings/PendingListingsPage';
import { SellerApplicationsPage } from '@/features/seller-applications/SellerApplicationsPage';

// Nav item id -> real page component, filled in phase by phase. Anything
// not listed here still falls back to ModulePlaceholder (see Phase 0).
const MODULE_PAGES: Partial<Record<string, ComponentType>> = {
  properties: PropertiesPage,
  agents: AgentsPage,
  'pending-listings': PendingListingsPage,
  'seller-applications': SellerApplicationsPage,
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
    // Phase-0 scratch preview is served from a single static HTML file
    // (not a clean SPA root), so the router needs this as its base path.
    // The real cutover (Phase 1) mounts at admin-dashboard.html the same
    // way and will carry the same basename requirement. Deep-link/hard
    // refresh on a sub-path (e.g. /admin-react-preview.html/properties)
    // isn't wired up yet for this scratch entry — client-side nav (clicking
    // sidebar items) works fine; that's what Phase 0 verification checks.
    basename: '/admin-react-preview.html',
  },
);
