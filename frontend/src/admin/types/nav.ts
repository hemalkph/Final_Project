import type { LucideIcon } from 'lucide-react';

/**
 * 'functional' = full backend support today.
 * 'partial'    = some backend support (e.g. entity exists, no admin
 *                controller yet) — page ships with real data where it
 *                genuinely exists, unfinished sections clearly marked.
 * 'absent'     = zero backend support — nav item is disabled, no route.
 */
export type ModuleBackendStatus = 'functional' | 'partial' | 'absent';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  status: ModuleBackendStatus;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}
