import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerProfile } from '@/lib/auth';
import { getMetrics, parseWindow, METRICS_WINDOWS, type MetricsWindow } from '@/lib/metrics';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const WINDOW_LABELS: Record<MetricsWindow, string> = {
  '7d': '7d',
  '30d': '30d',
  '90d': '90d',
  all: 'All',
};

function formatInt(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function formatPct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDays(value: number | null) {
  if (value === null) return '—';
  if (value < 1) return `${(value * 24).toFixed(1)}h`;
  return `${value.toFixed(1)}d`;
}

function formatHours(value: number | null) {
  if (value === null) return '—';
  if (value < 1) return `${Math.round(value * 60)}min`;
  if (value > 48) return `${(value / 24).toFixed(1)}d`;
  return `${value.toFixed(1)}h`;
}

function formatDecimal(value: number | null) {
  if (value === null) return '—';
  return value.toFixed(1);
}

interface StatProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

function Stat({ label, value, sub, accent = false }: StatProps) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold tabular-nums leading-none tracking-tight',
          accent && 'text-primary',
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ window?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const profile = await getServerProfile();
  if (!profile?.is_admin) redirect('/');

  const params = await searchParams;
  const window = parseWindow(params.window);
  const m = await getMetrics(window);

  const windowSuffix = m.windowDays !== null ? `last ${m.windowDays}d` : 'all time';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Back to admin
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Internal dashboard. Numbers refresh on page load.
        </p>
      </div>

      <nav aria-label="Time window" className="inline-flex rounded-md bg-muted p-1">
        {METRICS_WINDOWS.map((w) => {
          const isActive = w === window;
          return (
            <Link
              key={w}
              href={`/admin/analytics?window=${w}`}
              className={cn(
                'inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {WINDOW_LABELS[w]}
            </Link>
          );
        })}
      </nav>

      <section className="space-y-3">
        <SectionHeader title="Adoption" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Lodge adoption"
            value={formatPct(m.adoption.adoptionRate)}
            sub={`${m.adoption.approvedUsers} of ${m.adoption.lodgeSize}`}
            accent
          />
          <Stat label="New signups" value={formatInt(m.adoption.newSignupsInWindow)} sub={windowSuffix} />
          <Stat label="Pending approvals" value={formatInt(m.adoption.pendingApprovals)} sub="awaiting review" />
          <Stat label="Approved users" value={formatInt(m.adoption.approvedUsers)} sub="active accounts" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Engagement" hint="based on last app open" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Weekly active" value={formatInt(m.engagement.wau)} sub="last 7d" />
          <Stat label="Monthly active" value={formatInt(m.engagement.mau)} sub="last 30d" />
          <Stat label="Stickiness" value={formatPct(m.engagement.stickiness)} sub="WAU ÷ MAU" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Marketplace" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Live listings" value={formatInt(m.marketplace.liveListings)} sub="status = live" />
          <Stat label="New listings" value={formatInt(m.marketplace.newListingsInWindow)} sub={windowSuffix} />
          <Stat label="Sold" value={formatInt(m.marketplace.soldInWindow)} sub={windowSuffix} />
          <Stat
            label="Time to sold"
            value={formatDays(m.marketplace.medianTimeToSoldDays)}
            sub="median, all time"
          />
          <Stat
            label="Sell-through"
            value={m.marketplace.sellThroughRate === null ? '—' : formatPct(m.marketplace.sellThroughRate)}
            sub="sold ÷ (live + sold)"
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Conversation" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Conversations started"
            value={formatInt(m.conversation.conversationsStartedInWindow)}
            sub={windowSuffix}
          />
          <Stat
            label="Listings with chat"
            value={formatPct(m.conversation.pctListingsWithConversation)}
            sub="≥1 conversation"
          />
          <Stat
            label="Avg messages / chat"
            value={formatDecimal(m.conversation.avgMessagesPerConversation)}
            sub="all time"
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Operational health" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Open reports" value={formatInt(m.health.openReports)} sub="needs review" />
          <Stat
            label="Time to resolve"
            value={formatHours(m.health.medianTimeToResolveHours)}
            sub="median, resolved reports"
          />
          <Stat
            label="Listing processing"
            value={formatHours(m.health.medianListingProcessingHours)}
            sub="median, submission → approval"
          />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Generated {new Date(m.generatedAt).toLocaleString('en-GB')}
      </p>
    </div>
  );
}
