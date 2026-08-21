import type { PropertyFilters } from '@/types/property';

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
    publicList: () => ['agents', 'public'] as const,
  },
};
