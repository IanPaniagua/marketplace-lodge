import { getServerProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ListingForm from '@/components/listing/ListingForm';

export const metadata = { title: 'Publicar anuncio — Lodge Market' };

export default async function NewListingPage() {
  const profile = await getServerProfile();
  if (!profile) redirect('/login');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        Publicar anuncio
      </h1>
      <ListingForm mode="create" />
    </div>
  );
}
