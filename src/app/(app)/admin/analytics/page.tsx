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
  all: 'Todo',
};

function formatInt(n: number) {
  return new Intl.NumberFormat('es-ES').format(Math.round(n));
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
  if (!profile?.is_admin) redirect('/friends');

  const params = await searchParams;
  const window = parseWindow(params.window);
  const m = await getMetrics(window);

  const windowSuffix = m.windowDays !== null ? `últimos ${m.windowDays} días` : 'histórico';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Analítica</h1>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Volver a administración
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Panel interno. Los datos se actualizan al cargar la página.
        </p>
      </div>

      <nav aria-label="Periodo" className="inline-flex rounded-md bg-muted p-1">
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
        <SectionHeader title="Crecimiento" />
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Usuarios totales"
            value={formatInt(m.growth.totalUsers)}
            sub="cuentas disponibles"
            accent
          />
          <Stat label="Nuevos registros" value={formatInt(m.growth.newSignupsInWindow)} sub={windowSuffix} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Participación" hint="según la última apertura" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Activos semanales" value={formatInt(m.engagement.wau)} sub="últimos 7 días" />
          <Stat label="Activos mensuales" value={formatInt(m.engagement.mau)} sub="últimos 30 días" />
          <Stat label="Recurrencia" value={formatPct(m.engagement.stickiness)} sub="WAU ÷ MAU" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Mercado" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Anuncios activos" value={formatInt(m.marketplace.liveListings)} sub="publicados" />
          <Stat label="Nuevos anuncios" value={formatInt(m.marketplace.newListingsInWindow)} sub={windowSuffix} />
          <Stat label="Vendidos" value={formatInt(m.marketplace.soldInWindow)} sub={windowSuffix} />
          <Stat
            label="Tiempo hasta venta"
            value={formatDays(m.marketplace.medianTimeToSoldDays)}
            sub="mediana histórica"
          />
          <Stat
            label="Tasa de venta"
            value={m.marketplace.sellThroughRate === null ? '—' : formatPct(m.marketplace.sellThroughRate)}
            sub="sold ÷ (live + sold)"
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Conversaciones" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Conversaciones iniciadas"
            value={formatInt(m.conversation.conversationsStartedInWindow)}
            sub={windowSuffix}
          />
          <Stat
            label="Anuncios con chat"
            value={formatPct(m.conversation.pctListingsWithConversation)}
            sub="≥1 conversation"
          />
          <Stat
            label="Media mensajes / chat"
            value={formatDecimal(m.conversation.avgMessagesPerConversation)}
            sub="histórico"
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Salud operativa" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Reportes abiertos" value={formatInt(m.health.openReports)} sub="requieren revisión" />
          <Stat
            label="Tiempo de resolución"
            value={formatHours(m.health.medianTimeToResolveHours)}
            sub="mediana de reportes resueltos"
          />
          <Stat
            label="Revisión de anuncios"
            value={formatHours(m.health.medianListingProcessingHours)}
            sub="mediana, envío → aprobación"
          />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Generado el {new Date(m.generatedAt).toLocaleString('es-ES')}
      </p>
    </div>
  );
}
