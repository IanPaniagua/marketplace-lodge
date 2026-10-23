import PendingView from '@/components/auth/PendingView';

interface Props {
  searchParams: Promise<{ invited?: string }>;
}

export const metadata = { title: 'Esperando aprobación — Lodge Market' };

export default async function PendingPage({ searchParams }: Props) {
  const { invited } = await searchParams;
  return <PendingView invited={invited === '1'} />;
}
