export const INQUIRY_STATUSES = ['PENDING', 'REPLIED', 'CLOSED'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

/** Matches InquiryMessageDTO — senderRole mirrors the backend Role enum. */
export interface InquiryMessage {
  id: number;
  senderId: number;
  senderName: string | null;
  senderRole: 'USER' | 'AGENT' | 'ADMIN' | 'SELLER';
  text: string;
  createdAt: string;
}

/** Matches InquiryDTO — read shape from GET /api/admin/inquiries*. */
export interface Inquiry {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  propertyId: number;
  propertyTitle: string | null;
  propertyAddress: string | null;
  propertyImage: string | null;
  propertyPrice: number | null;
  propertyBedrooms: number | null;
  propertyBathrooms: number | null;
  propertyAreaSqFt: number | null;
  propertyType: string | null;
  assignedAgentId: number | null;
  assignedAgentName: string | null;
  assignedAgentProfileImage: string | null;
  assignedAgentPhone: string | null;
  assignedAgentTitle: string | null;
  status: InquiryStatus;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  hasUnread: boolean;
}
