import { apiClient } from '@/lib/apiClient';
import type { Property } from '@/types/property';

interface ListingActionResponse {
  success: boolean;
  message: string;
  property: Property;
}

export const pendingListingsApi = {
  getAll: async (): Promise<Property[]> => {
    const { data } = await apiClient.get<Property[]>('/admin/listings/pending');
    return data;
  },

  approve: async (id: number, message: string): Promise<Property> => {
    const { data } = await apiClient.put<ListingActionResponse>(`/admin/listings/${id}/approve`, { message });
    return data.property;
  },

  // Backend resolves the reason from `message` before `reason` — send
  // `message` so this always wins regardless of which key it checks first.
  reject: async (id: number, reason: string): Promise<Property> => {
    const { data } = await apiClient.put<ListingActionResponse>(`/admin/listings/${id}/reject`, { message: reason });
    return data.property;
  },
};
