import { apiClient } from '@/lib/apiClient';
import type { Inquiry, InquiryMessage, InquiryStatus } from '@/types/inquiry';

export const inquiriesApi = {
  getAll: async (status?: InquiryStatus): Promise<Inquiry[]> => {
    const { data } = await apiClient.get<Inquiry[]>('/admin/inquiries', {
      params: status ? { status } : undefined,
    });
    return data;
  },

  getById: async (id: number): Promise<Inquiry> => {
    const { data } = await apiClient.get<Inquiry>(`/admin/inquiries/${id}`);
    return data;
  },

  getMessages: async (id: number): Promise<InquiryMessage[]> => {
    const { data } = await apiClient.get<InquiryMessage[]>(`/admin/inquiries/${id}/messages`);
    return data;
  },

  reply: async (id: number, text: string): Promise<InquiryMessage> => {
    const { data } = await apiClient.post<InquiryMessage>(`/admin/inquiries/${id}/reply`, { text });
    return data;
  },

  close: async (id: number): Promise<void> => {
    await apiClient.post(`/admin/inquiries/${id}/close`);
  },

  reassign: async (id: number, agentId: number): Promise<void> => {
    await apiClient.post(`/admin/inquiries/${id}/reassign/${agentId}`);
  },
};
