'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { SESSION_COOKIE } from '@/lib/insforge';
import { createServerClient } from '@/lib/insforge-server';

const TokenSchema = z.string().uuid();

type InviteRow = {
  invite_token: string;
  invite_expires_at: string;
};

type ClaimRow = {
  claim_status: string;
  inviter_id: string | null;
  inviter_name: string | null;
};

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const client = createServerClient(token);
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data?.user) return null;
  return client;
}

export async function createFriendInvite(): Promise<{
  error: string | null;
  token?: string;
  expiresAt?: string;
}> {
  const client = await getAuthenticatedClient();
  if (!client) return { error: 'Inicia sesión para crear una invitación.' };

  const { data, error } = await client.database.rpc('get_or_create_friend_invite');
  const rows = (data ?? []) as InviteRow[];
  const invitation = rows[0];

  if (error || !invitation) {
    return { error: 'No se pudo crear la invitación. Inténtalo de nuevo.' };
  }

  return {
    error: null,
    token: invitation.invite_token,
    expiresAt: invitation.invite_expires_at,
  };
}

export async function claimFriendInvite(inviteToken: string): Promise<{
  error: string | null;
  status?: string;
  inviterId?: string;
  inviterName?: string;
}> {
  const parsed = TokenSchema.safeParse(inviteToken);
  if (!parsed.success) return { error: 'Esta invitación no es válida.' };

  const client = await getAuthenticatedClient();
  if (!client) return { error: 'Inicia sesión para aceptar la invitación.' };

  const { data, error } = await client.database.rpc('claim_friend_invite', {
    p_token: parsed.data,
  });
  const rows = (data ?? []) as ClaimRow[];
  const claim = rows[0];

  if (error || !claim) return { error: 'No se pudo aceptar la invitación.' };

  const messages: Record<string, string> = {
    invalid: 'La invitación ha caducado o ya no está disponible.',
    self: 'No puedes aceptar tu propia invitación.',
    blocked: 'No se puede completar esta invitación.',
    profile_missing: 'Termina de crear tu perfil antes de aceptar la invitación.',
    not_authenticated: 'Inicia sesión para aceptar la invitación.',
    already_claimed: 'Esta invitación ya se utilizó anteriormente.',
  };

  if (messages[claim.claim_status]) {
    return { error: messages[claim.claim_status], status: claim.claim_status };
  }

  if (!['claimed', 'already_friends'].includes(claim.claim_status)) {
    return { error: 'No se pudo aceptar la invitación.' };
  }

  revalidatePath('/');
  if (claim.inviter_id) revalidatePath(`/profile/${claim.inviter_id}`);

  return {
    error: null,
    status: claim.claim_status,
    inviterId: claim.inviter_id ?? undefined,
    inviterName: claim.inviter_name ?? undefined,
  };
}
