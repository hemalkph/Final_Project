import { apiClient } from '@/lib/apiClient';
import type { Property, PropertyFilters, PropertyFormValues } from '@/types/property';

function toRequestBody(values: PropertyFormValues) {
  return {
    title: values.title,
    description: values.description || null,
    address: values.address,
    price: values.price,
    type: values.type,
    houseType: values.houseType || null,
    status: values.status,
    imageUrl: values.imageUrl || null,
    bedrooms: values.bedrooms,
    bathrooms: values.bathrooms,
    areaSqFt: values.areaSqFt,
    facilities: values.facilities,
    imageUrls: values.imageUrls,
    houseRules: values.houseRules || null,
    assignedAgent: values.assignedAgentId ? { id: values.assignedAgentId } : null,
  };
}

export const propertiesApi = {
  // filters is required (not optional with a default) so every call site
  // stays explicit about what it's asking for — matches GET /api/properties'
  // real q/type/houseType support today; extending to page/size/sort later
  // only means adding fields to PropertyFilters and this function body.
  getAll: async (filters: PropertyFilters): Promise<Property[]> => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.type) params.set('type', filters.type);
    if (filters.houseType) params.set('houseType', filters.houseType);
    const qs = params.toString();
    const { data } = await apiClient.get<Property[]>(`/properties${qs ? `?${qs}` : ''}`);
    return data;
  },

  getById: async (id: number): Promise<Property> => {
    const { data } = await apiClient.get<Property>(`/properties/${id}`);
    return data;
  },

  create: async (values: PropertyFormValues): Promise<Property> => {
    const { data } = await apiClient.post<Property>('/properties', toRequestBody(values));
    return data;
  },

  update: async (id: number, values: PropertyFormValues): Promise<Property> => {
    const { data } = await apiClient.put<Property>(`/properties/${id}`, toRequestBody(values));
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/properties/${id}`);
  },
};
