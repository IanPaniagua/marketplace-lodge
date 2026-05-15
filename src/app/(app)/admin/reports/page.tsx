import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { formatDistanceToNow } from 'date-fns';
import ReportActions from '@/components/admin/ReportActions';
import type { Profile } from '@/types/db';

interface ReportRow {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminReportsPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  const client = createServerClient(token);
  const { data: userData } = await client.auth.getCurrentUser();
  const me = userData?.user?.id;
  if (!me) redirect('/login');

  // Verify admin
  const { data: profileRaw } = await client.database
    .from('profiles')
    .select('id,is_admin')
    .eq('id', me)
    .single();

  const profile = profileRaw as unknown as Pick<Profile, 'id' | 'is_admin'> | null;
  if (!profile?.is_admin) notFound();

  const { tab: rawTab } = await searchParams;
  const tab = rawTab === 'resolved' ? 'resolved' : rawTab === 'dismissed' ? 'dismissed' : 'open';

  // Fetch reports filtered by status
  const { data: reportsRaw } = await client.database
    .from('reports')
    .select('id,reporter_id,target_type,target_id,reason,status,resolved_by,resolved_at,created_at')
    .eq('status', tab)
    .order('created_at', { ascending: false });

  const reports = (reportsRaw ?? []) as unknown as ReportRow[];

  // Fetch reporter profiles
  const reporterIds = [...new Set(reports.map((r) => r.reporter_id))];
  const profileMap = new Map<string, Pick<Profile, 'id' | 'display_name'>>();

  if (reporterIds.length > 0) {
    const { data: profilesRaw } = await client.database
      .from('profiles')
      .select('id,display_name')
      .in('id', reporterIds);
    const profiles = (profilesRaw ?? []) as unknown as Pick<Profile, 'id' | 'display_name'>[];
    for (const p of profiles) {
      profileMap.set(p.id, p);
    }
  }

  const tabs: { key: string; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'dismissed', label: 'Dismissed' },
  ];

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-xl font-semibold tracking-tight">Reports</h1>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map(({ key, label }) => (
          <a
            key={key}
            href={`/admin/reports?tab=${key}`}
            className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {reports.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">
          No {tab} reports.
        </p>
      )}

      <div className="space-y-3">
        {reports.map((report) => {
          const reporter = profileMap.get(report.reporter_id);
          return (
            <div key={report.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    Reported by{' '}
                    <span className="font-medium text-foreground">
                      {reporter?.display_name ?? report.reporter_id}
                    </span>{' '}
                    · {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Target:{' '}
                    <span className="font-mono text-foreground text-[11px]">
                      {report.target_type}/{report.target_id}
                    </span>
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    report.status === 'open'
                      ? 'bg-yellow-100 text-yellow-800'
                      : report.status === 'resolved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {report.status}
                </span>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{report.reason}</p>

              {report.status === 'open' && (
                <ReportActions reportId={report.id} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
