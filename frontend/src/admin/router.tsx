import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ModulePlaceholder } from '@/components/module-placeholder';
import { enabledNavItems } from '@/lib/nav-config';

// Phase 0: every enabled ('functional'/'partial') nav item gets a route,
// but all of them render the same placeholder for now — no API/business
// logic ships until later phases (see migration plan). 'absent' items have
// no route at all (see AppSidebar's disabled rendering).
const moduleRoutes: RouteObject[] = enabledNavItems.map((item) =>
  item.path === '/'
    ? { index: true, element: <ModulePlaceholder title={item.label} /> }
    : { path: item.path.slice(1), element: <ModulePlaceholder title={item.label} /> },
);

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
