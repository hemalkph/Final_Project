import { apiClient } from '@/lib/apiClient';
import type { Agent, AgentFormValues, AgentOption } from '@/types/agent';

// Deliberately never includes id/createdAt/linkedUser — those are
// server-controlled (Phase 2a's mass-assignment fixes null them out
// server-side regardless, but the form shouldn't even offer them).
function toRequestBody(values: AgentFormValues) {
  return {
    name: values.name,
    email: values.email,
    phone: values.phone || null,
    title: values.title || null,
    specialization: values.specialization || null,
    location: values.location || null,
    status: values.status,
    degree: values.degree || null,
    qualifications: values.qualifications || null,
    experience: values.experience,
    propertiesSold: values.propertiesSold,
    rating: values.rating,
    bio: values.bio || null,
    profileImageUrl: values.profileImageUrl || null,
  };
}

export const agentsApi = {
  // ADMIN-only — all statuses. AgentController accepts no query params
  // today (no search/filter/sort/pagination), so this takes no argument.
  getAll: async (): Promise<Agent[]> => {
    const { data } = await apiClient.get<Agent[]>('/agents');
    return data;
  },

  getById: async (id: number): Promise<Agent> => {
    const { data } = await apiClient.get<Agent>(`/agents/${id}`);
    return data;
  },

  create: async (values: AgentFormValues): Promise<Agent> => {
    const { data } = await apiClient.post<Agent>('/agents', toRequestBody(values));
    return data;
  },

  update: async (id: number, values: AgentFormValues): Promise<Agent> => {
    const { data } = await apiClient.put<Agent>(`/agents/${id}`, toRequestBody(values));
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/agents/${id}`);
  },

  // Public, ACTIVE-only — moved here from features/properties/api.ts
  // (Phase 1 left a comment asking for this move once Phase 2 landed).
  // Still consumed by PropertyFormDialog's assignment dropdown.
  getPublic: async (): Promise<AgentOption[]> => {
    const { data } = await apiClient.get<AgentOption[]>('/agents/public');
    return data;
  },
};
