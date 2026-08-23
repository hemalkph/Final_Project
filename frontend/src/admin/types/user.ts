export const ROLES = ['USER', 'AGENT', 'ADMIN', 'SELLER'] as const;
export type UserRole = (typeof ROLES)[number];

/** Read shape from GET /api/admin/users — password is @JsonIgnore'd server-side. */
export interface AdminUser {
  id: number;
  name: string | null;
  email: string | null;
  role: UserRole;
  agentId: number | null;
  enabled: boolean;
}
