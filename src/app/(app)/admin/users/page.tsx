import { getServerProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/insforge-server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types/db';
import ApproveButton from './ApproveButton';

export default async function AdminUsersPage() {
  const profile = await getServerProfile();
  if (!profile?.is_admin) redirect('/');

  const admin = createAdminClient();
  const { data: pending } = await admin.database
    .from('profiles')
    .select('id, display_name, created_at')
    .eq('is_approved', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  const users = (pending ?? []) as Pick<Profile, 'id' | 'display_name' | 'created_at'>[];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pending approvals</h1>
        <p className="text-sm text-muted-foreground">
          {users.length === 0 ? 'No users waiting for approval.' : `${users.length} user${users.length === 1 ? '' : 's'} waiting.`}
        </p>
      </div>

      {users.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{u.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>
              <ApproveButton userId={u.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
