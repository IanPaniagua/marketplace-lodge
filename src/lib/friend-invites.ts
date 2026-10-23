import { createPublicClient } from '@/lib/insforge-server';

export interface FriendInvitePreview {
  inviter_id: string;
  display_name: string;
  avatar_url: string | null;
  expires_at: string;
}

export async function getFriendInvitePreview(
  token: string,
): Promise<FriendInvitePreview | null> {
  const client = createPublicClient();
  const { data, error } = await client.database.rpc('get_friend_invite_preview', {
    p_token: token,
  });

  if (error) return null;

  const rows = (data ?? []) as FriendInvitePreview[];
  return rows[0] ?? null;
}
