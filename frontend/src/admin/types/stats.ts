/** Read shape from GET /api/admin/stats — flat counts only, no time-series. */
export interface Stats {
  totalUsers: number;
  totalProperties: number;
  activeListings: number;
  pendingProperties: number;
  soldProperties: number;
  rentedProperties: number;
  totalAgents: number;
}
