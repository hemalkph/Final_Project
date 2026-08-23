import type { PropertyFilters } from '@/types/property';
import type { InquiryStatus } from '@/types/inquiry';

/**
 * Centralized query key builders — avoids typo'd/inconsistent keys across
 * features and keeps cache invalidation after mutations reliable.
 */
export const queryKeys = {
  properties: {
    all: () => ['properties'] as const,
    list: (filters: PropertyFilters) => ['properties', 'list', filters] as const,
    detail: (id: number) => ['properties', 'detail', id] as const,
  },
  agents: {
    // Prefix-matches ['agents','public'] too, so an agent mutation also
    // invalidates the Properties assignment dropdown — intentional.
    all: () => ['agents'] as const,
    detail: (id: number) => ['agents', 'detail', id] as const,
    publicList: () => ['agents', 'public'] as const,
  },
  pendingListings: {
    all: () => ['pending-listings'] as const,
  },
  sellerApplications: {
    all: () => ['seller-applications'] as const,
  },
  accounts: {
    all: () => ['accounts'] as const,
  },
  stats: {
    all: () => ['stats'] as const,
  },
  inquiries: {
    // ['inquiries'] prefix-matches list(status) for any status, so the
    // socket hook's "new inquiry" invalidation refreshes whatever filter
    // is currently active without needing to know it.
    all: () => ['inquiries'] as const,
    list: (status?: InquiryStatus) => ['inquiries', 'list', status ?? 'ALL'] as const,
    messages: (id: number) => ['inquiries', 'messages', id] as const,
  },
};
