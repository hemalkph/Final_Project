import { apiClient } from '@/lib/apiClient';
import type { ManualSellerFormValues, SellerAccount, SellerApplication } from '@/types/seller';

export const sellerApplicationsApi = {
  getAll: async (): Promise<SellerApplication[]> => {
    const { data } = await apiClient.get<SellerApplication[]>('/admin/sellers/pending');
    return data;
  },

  approve: async (id: number): Promise<void> => {
    await apiClient.post(`/admin/sellers/${id}/approve`);
  },

  // POST /admin/sellers/{id}/reject is dead (always 400 — see Phase 3
  // audit); reject-with-reason is the only functional reject path.
  reject: async (id: number, reason: string): Promise<void> => {
    await apiClient.post(`/admin/sellers/${id}/reject-with-reason`, { reason });
  },
};

export const accountsApi = {
  getPreGenerated: async (): Promise<SellerAccount[]> => {
    const { data } = await apiClient.get<SellerAccount[]>('/admin/sellers/pre-generated');
    return data;
  },

  createManual: async (values: ManualSellerFormValues): Promise<void> => {
    await apiClient.post('/admin/sellers/manual', values);
  },
};
