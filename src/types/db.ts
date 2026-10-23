export type ListingStatus = 'draft' | 'pending' | 'live' | 'sold' | 'archived' | 'rejected';
export type ListingCategory = 'furniture' | 'kitchen' | 'electronics' | 'books' | 'clothes' | 'other';
export type ListingCondition = 'new' | 'like_new' | 'used' | 'worn';
export type ListingVisibility = 'everyone' | 'friends';
export type FriendshipStatus = 'pending' | 'accepted';
export type ReportTargetType = 'user' | 'listing' | 'conversation';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
  is_approved: boolean;
  deleted_at: string | null;
  created_at: string;
  last_active_at: string | null;
}

export interface Listing {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  price_eur: number | null;
  is_gift: boolean;
  category: ListingCategory;
  condition: ListingCondition;
  visibility: ListingVisibility;
  status: ListingStatus;
  rejection_reason: string | null;
  first_approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}

export interface FriendInvite {
  id: string;
  token: string;
  inviter_id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface FriendInviteClaim {
  invite_id: string;
  inviter_id: string;
  invitee_id: string;
  claimed_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Rating {
  id: string;
  rater_id: string;
  ratee_id: string;
  listing_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  edit_locked_at: string;
}

export type NotificationType = 'message' | 'listing' | 'admin_user' | 'admin_listing';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  ref_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Block {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}
