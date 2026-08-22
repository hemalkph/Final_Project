export const AGENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

// Matches the legacy admin form's option list exactly (admin-dashboard.html).
export const SPECIALIZATIONS = [
  'Luxury Properties',
  'Residential',
  'Commercial',
  'Land & Plots',
  'Apartments',
  'Industrial',
  'Rental Properties',
] as const;

/**
 * Full read shape from GET /api/agents*. `linkedUser` is intentionally
 * absent — the backend has @JsonIgnore'd it (see Phase 2a fix #2), so it
 * never appears in the response at all.
 */
export interface Agent {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  title: string | null;
  bio: string | null;
  qualifications: string | null;
  degree: string | null;
  experience: number | null;
  specialization: string | null;
  // Free text, NOT a managed taxonomy — live data includes values outside
  // the 25-district list (e.g. "Negombo"), so this is deliberately not an
  // enum. A managed Locations module can design that properly later.
  location: string | null;
  propertiesSold: number;
  rating: number;
  status: AgentStatus;
  createdAt: string | null;
}

/** Minimal shape needed for the Properties module's assignment dropdown. Backed by GET /api/agents/public. */
export type AgentOption = Pick<Agent, 'id' | 'name' | 'email'>;

/**
 * Server-side filters — NOT wired into any request yet. AgentController
 * accepts no query params today (no search, no status/specialization/
 * location filtering, no pagination). This type exists only so a future
 * server-side endpoint has somewhere to land; agentsApi.getAll() takes no
 * argument and this type is unused until that backend work happens.
 */
export interface AgentFilters {
  q?: string;
  status?: AgentStatus;
  specialization?: string;
  location?: string;
}

/**
 * Shared Add/Edit form shape. Deliberately excludes id/createdAt/linkedUser
 * — those are server-controlled (see the Phase 2a mass-assignment fixes)
 * and must never be sent by this form.
 */
export interface AgentFormValues {
  name: string;
  email: string;
  phone: string;
  title: string;
  specialization: string;
  location: string;
  status: AgentStatus;
  degree: string;
  qualifications: string;
  experience: number | null;
  propertiesSold: number | null;
  rating: number | null;
  bio: string;
  profileImageUrl: string;
}
