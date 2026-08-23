import { apiClient } from '@/lib/apiClient';
import type { AdminUser } from '@/types/user';

export const usersApi = {
  getAll: async (): Promise<AdminUser[]> => {
    const { data } = await apiClient.get<AdminUser[]>('/admin/users');
    return data;
  },
};
