import { apiClient } from '@/lib/apiClient';
import type { Stats } from '@/types/stats';

export const statsApi = {
  getStats: async (): Promise<Stats> => {
    const { data } = await apiClient.get<Stats>('/admin/stats');
    return data;
  },
};
