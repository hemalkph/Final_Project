import {
  LayoutDashboard,
  Building2,
  UsersRound,
  Handshake,
  Target,
  CalendarClock,
  MessagesSquare,
  Bell,
  Receipt,
  Repeat,
  Star,
  ShieldAlert,
  LifeBuoy,
  MapPin,
  BarChart3,
  Megaphone,
  FileText,
  ShieldCheck,
  ScrollText,
  Settings as SettingsIcon,
  ListChecks,
  UserCheck,
} from 'lucide-react';
import type { NavGroup } from '@/types/nav';

/**
 * Single source of truth for the admin sidebar's information architecture.
 * `status` drives whether an item is a clickable route (functional/partial)
 * or a disabled "coming soon" row (absent) — see AppSidebar.tsx. Backend
 * status is per the migration plan's module gap-check; flipping an item
 * from 'absent' once its backend work ships is the only change needed to
 * enable it here.
 */
export const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, status: 'functional' },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    items: [
      { id: 'properties', label: 'Properties', path: '/properties', icon: Building2, status: 'functional' },
      { id: 'pending-listings', label: 'Pending Listings', path: '/pending-listings', icon: ListChecks, status: 'functional' },
      { id: 'users', label: 'Users', path: '/users', icon: UsersRound, status: 'partial' },
      { id: 'agents', label: 'Agents & Agencies', path: '/agents', icon: Handshake, status: 'functional' },
      { id: 'leads-crm', label: 'Leads & CRM', path: '/leads-crm', icon: Target, status: 'absent' },
      { id: 'appointments', label: 'Appointments', path: '/appointments', icon: CalendarClock, status: 'absent' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    items: [
      // Both were previously marked 'functional' with no real page behind
      // them (silently fell back to ModulePlaceholder) — corrected to
      // 'absent' so the sidebar badge is honest. Real build is Phase 4.
      { id: 'messages', label: 'Messages', path: '/messages', icon: MessagesSquare, status: 'absent' },
      { id: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell, status: 'absent' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { id: 'transactions', label: 'Transactions', path: '/transactions', icon: Receipt, status: 'absent' },
      { id: 'subscriptions', label: 'Subscriptions', path: '/subscriptions', icon: Repeat, status: 'absent' },
    ],
  },
  {
    id: 'trust-operations',
    label: 'Trust & Operations',
    items: [
      { id: 'reviews-moderation', label: 'Reviews & Moderation', path: '/reviews-moderation', icon: Star, status: 'absent' },
      { id: 'seller-applications', label: 'Seller Applications', path: '/seller-applications', icon: UserCheck, status: 'functional' },
      { id: 'verification-fraud', label: 'Verification & Fraud', path: '/verification-fraud', icon: ShieldAlert, status: 'partial' },
      { id: 'support', label: 'Support', path: '/support', icon: LifeBuoy, status: 'absent' },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    items: [
      { id: 'locations', label: 'Locations', path: '/locations', icon: MapPin, status: 'partial' },
      { id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3, status: 'partial' },
      { id: 'marketing', label: 'Marketing', path: '/marketing', icon: Megaphone, status: 'absent' },
      { id: 'content-seo', label: 'Content & SEO', path: '/content-seo', icon: FileText, status: 'absent' },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      { id: 'security-access', label: 'Security & Access', path: '/security-access', icon: ShieldCheck, status: 'absent' },
      { id: 'audit-logs', label: 'Audit Logs', path: '/audit-logs', icon: ScrollText, status: 'absent' },
      { id: 'settings', label: 'Settings', path: '/settings', icon: SettingsIcon, status: 'absent' },
    ],
  },
];

export const allNavItems = navGroups.flatMap((group) => group.items);

/** Items with a real (or partially real) route in Phase 0 — everything else is disabled-only. */
export const enabledNavItems = allNavItems.filter((item) => item.status !== 'absent');
