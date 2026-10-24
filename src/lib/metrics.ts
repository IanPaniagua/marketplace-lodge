import { createAdminClient } from './insforge-server';

export const METRICS_WINDOWS = ['7d', '30d', '90d', 'all'] as const;
export type MetricsWindow = (typeof METRICS_WINDOWS)[number];

export interface MetricsPayload {
  generatedAt: string;
  window: MetricsWindow;
  windowDays: number | null;
  growth: {
    totalUsers: number;
    newSignupsInWindow: number;
  };
  engagement: {
    wau: number;
    mau: number;
    stickiness: number;
  };
  marketplace: {
    liveListings: number;
    newListingsInWindow: number;
    soldInWindow: number;
    medianTimeToSoldDays: number | null;
    sellThroughRate: number | null;
  };
  conversation: {
    conversationsStartedInWindow: number;
    pctListingsWithConversation: number;
    avgMessagesPerConversation: number | null;
  };
  health: {
    openReports: number;
    medianTimeToResolveHours: number | null;
    medianListingProcessingHours: number | null;
  };
}

export function parseWindow(value: string | null | undefined): MetricsWindow {
  if (value === '7d' || value === '30d' || value === '90d' || value === 'all') {
    return value;
  }
  return '30d';
}

function windowDaysFor(window: MetricsWindow): number | null {
  if (window === 'all') return null;
  return Number(window.replace('d', ''));
}

function cutoffISO(days: number | null): string | null {
  if (days === null) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function getMetrics(window: MetricsWindow): Promise<MetricsPayload> {
  const admin = createAdminClient();
  const days = windowDaysFor(window);
  const cutoff = cutoffISO(days);
  const cutoff7 = cutoffISO(7)!;
  const cutoff30 = cutoffISO(30)!;

  const totalUsersQ = admin.database
    .from('profiles')
    .select('id')
    .is('deleted_at', null);

  let newSignupsQ = admin.database
    .from('profiles')
    .select('id')
    .is('deleted_at', null);
  if (cutoff) newSignupsQ = newSignupsQ.gte('created_at', cutoff);

  const wauQ = admin.database
    .from('profiles')
    .select('id')
    .is('deleted_at', null)
    .gte('last_active_at', cutoff7);

  const mauQ = admin.database
    .from('profiles')
    .select('id')
    .is('deleted_at', null)
    .gte('last_active_at', cutoff30);

  const liveListingsQ = admin.database
    .from('listings')
    .select('id')
    .eq('status', 'live');

  let newListingsQ = admin.database
    .from('listings')
    .select('id');
  if (cutoff) newListingsQ = newListingsQ.gte('created_at', cutoff);

  let soldInWindowQ = admin.database
    .from('listings')
    .select('id')
    .eq('status', 'sold');
  if (cutoff) soldInWindowQ = soldInWindowQ.gte('updated_at', cutoff);

  const allSoldQ = admin.database
    .from('listings')
    .select('created_at,updated_at')
    .eq('status', 'sold');

  const allLiveAndSoldQ = admin.database
    .from('listings')
    .select('id,status')
    .in('status', ['live', 'sold']);

  let conversationsInWindowQ = admin.database
    .from('conversations')
    .select('id');
  if (cutoff) conversationsInWindowQ = conversationsInWindowQ.gte('created_at', cutoff);

  const conversationsAllQ = admin.database
    .from('conversations')
    .select('listing_id');

  const totalMessagesQ = admin.database
    .from('messages')
    .select('id');

  const totalConversationsQ = admin.database
    .from('conversations')
    .select('id');

  const openReportsQ = admin.database
    .from('reports')
    .select('id')
    .eq('status', 'open');

  const resolvedReportsQ = admin.database
    .from('reports')
    .select('created_at,resolved_at')
    .eq('status', 'resolved');

  const listingProcessingQ = admin.database
    .from('listings')
    .select('created_at,first_approved_at')
    .not('first_approved_at', 'is', null);

  const [
    totalUsersRes,
    newSignupsRes,
    wauRes,
    mauRes,
    liveListingsRes,
    newListingsRes,
    soldInWindowRes,
    allSoldRes,
    allLiveAndSoldRes,
    conversationsInWindowRes,
    conversationsAllRes,
    totalMessagesRes,
    totalConversationsRes,
    openReportsRes,
    resolvedReportsRes,
    listingProcessingRes,
  ] = await Promise.all([
    totalUsersQ,
    newSignupsQ,
    wauQ,
    mauQ,
    liveListingsQ,
    newListingsQ,
    soldInWindowQ,
    allSoldQ,
    allLiveAndSoldQ,
    conversationsInWindowQ,
    conversationsAllQ,
    totalMessagesQ,
    totalConversationsQ,
    openReportsQ,
    resolvedReportsQ,
    listingProcessingQ,
  ]);

  const totalUsers = (totalUsersRes.data ?? []).length;
  const newSignupsInWindow = (newSignupsRes.data ?? []).length;
  const wau = (wauRes.data ?? []).length;
  const mau = (mauRes.data ?? []).length;
  const liveListings = (liveListingsRes.data ?? []).length;
  const newListingsInWindow = (newListingsRes.data ?? []).length;
  const soldInWindow = (soldInWindowRes.data ?? []).length;
  const openReports = (openReportsRes.data ?? []).length;

  const soldRows = (allSoldRes.data ?? []) as Array<{ created_at: string; updated_at: string }>;
  const ttsDays = soldRows.map(
    (r) => (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000),
  );
  const medianTimeToSoldDays = median(ttsDays);

  const allLiveAndSold = (allLiveAndSoldRes.data ?? []) as Array<{ status: string }>;
  const soldEver = allLiveAndSold.filter((r) => r.status === 'sold').length;
  const totalLiveAndSold = allLiveAndSold.length;
  const sellThroughRate = totalLiveAndSold > 0 ? soldEver / totalLiveAndSold : null;

  const conversationsStartedInWindow = (conversationsInWindowRes.data ?? []).length;

  const convListings = (conversationsAllRes.data ?? []) as Array<{ listing_id: string }>;
  const distinctListingsWithConv = new Set(convListings.map((c) => c.listing_id)).size;
  const pctListingsWithConversation = totalLiveAndSold > 0 ? distinctListingsWithConv / totalLiveAndSold : 0;

  const totalMessages = (totalMessagesRes.data ?? []).length;
  const totalConversations = (totalConversationsRes.data ?? []).length;
  const avgMessagesPerConversation = totalConversations > 0 ? totalMessages / totalConversations : null;

  const resolvedReports = (resolvedReportsRes.data ?? []) as Array<{
    created_at: string;
    resolved_at: string | null;
  }>;
  const ttrHours = resolvedReports
    .filter((r): r is { created_at: string; resolved_at: string } => r.resolved_at !== null)
    .map((r) => (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / (60 * 60 * 1000));
  const medianTimeToResolveHours = median(ttrHours);

  const processingRows = (listingProcessingRes.data ?? []) as Array<{
    created_at: string;
    first_approved_at: string;
  }>;
  const processingHours = processingRows.map(
    (r) => (new Date(r.first_approved_at).getTime() - new Date(r.created_at).getTime()) / (60 * 60 * 1000),
  );
  const medianListingProcessingHours = median(processingHours);

  return {
    generatedAt: new Date().toISOString(),
    window,
    windowDays: days,
    growth: {
      totalUsers,
      newSignupsInWindow,
    },
    engagement: {
      wau,
      mau,
      stickiness: mau > 0 ? wau / mau : 0,
    },
    marketplace: {
      liveListings,
      newListingsInWindow,
      soldInWindow,
      medianTimeToSoldDays,
      sellThroughRate,
    },
    conversation: {
      conversationsStartedInWindow,
      pctListingsWithConversation,
      avgMessagesPerConversation,
    },
    health: {
      openReports,
      medianTimeToResolveHours,
      medianListingProcessingHours,
    },
  };
}
