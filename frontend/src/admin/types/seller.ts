export const APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Read shape from GET /api/admin/sellers/pending. */
export interface SellerApplication {
  id: number;
  fullName: string | null;
  email: string | null;
  address: string | null;
  phone: string | null;
  cityOrDistrict: string | null;
  nicOrCompanyRegNo: string | null;
  status: ApplicationStatus;
  // Rejection reason lives here, not a `rejectionReason` field — differs
  // from Property's naming (see Phase 3 audit).
  adminNote: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Read shape from GET /api/admin/sellers/pre-generated. */
export interface SellerAccount {
  username: string;
  password: string;
}

export interface ManualSellerFormValues {
  username: string;
  password: string;
}
