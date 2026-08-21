import type { AgentOption } from './agent';

export const PROPERTY_TYPES = ['SALE', 'RENT', 'SHORT_STAY_RENTAL'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const HOUSE_TYPES = [
  'APARTMENT',
  'MANUFACTURED',
  'HOUSE',
  'TOWNHOME',
  'LAND',
  'MULTI_FAMILY',
] as const;
export type HouseType = (typeof HOUSE_TYPES)[number];

// 5 values — the old admin-dashboard.html audit only surfaced 4; REJECTED
// is real and set by the admin listing-approval flow (Phase 3).
export const PROPERTY_STATUSES = ['PENDING', 'AVAILABLE', 'SOLD', 'RENTED', 'REJECTED'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

const FACILITY_OPTIONS = ['WiFi', 'Parking', 'Air Conditioning', 'Pool', 'Gym', 'Kitchen'] as const;
export { FACILITY_OPTIONS };

/**
 * Full read shape from GET /api/properties*. `agent` is the raw linked User
 * — intentionally typed WITHOUT `password` here (never read/rendered),
 * independent of the backend @JsonIgnore fix (see plan's Commit B).
 */
export interface Property {
  id: number;
  title: string | null;
  description: string | null;
  address: string | null;
  price: number;
  type: PropertyType;
  houseType: HouseType | null;
  status: PropertyStatus;
  imageUrl: string | null;
  imageUrls: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqFt: number | null;
  facilities: string[];
  houseRules: string | null;
  agent: { id: number; name: string; email: string } | null;
  assignedAgent: AgentOption | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  driveLink: string | null;
  rejectionReason: string | null;
  adminDecisionMessage: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
}

/**
 * Server-side filters — matches exactly what GET /api/properties supports
 * today (q/type/houseType, no pagination/sort/price-range/bedrooms). Shaped
 * as one object (not separate function params) so adding page/size/sort
 * later is a pure extension of this type and of propertiesApi.getAll's
 * signature, not a rewrite of every call site.
 */
export interface PropertyFilters {
  q?: string;
  type?: PropertyType;
  houseType?: HouseType;
}

/**
 * Shared Add/Edit form shape. The old admin-dashboard.html Add AND Edit
 * modals both excluded owner fields and driveLink (those only appear in the
 * seller self-submission flow, a different page) — so this single shape
 * covers both modes with full parity, no fields need to be conditionally
 * hidden between add/edit.
 */
export interface PropertyFormValues {
  title: string;
  description: string;
  address: string;
  price: number;
  type: PropertyType;
  houseType: HouseType | '';
  status: PropertyStatus;
  imageUrl: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqFt: number | null;
  assignedAgentId: number | null;
  facilities: string[];
  imageUrls: string[];
  houseRules: string;
}
