import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerClient } from '@/lib/insforge-server';
import { SESSION_COOKIE } from '@/lib/insforge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Globe2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ListingGallery from '@/components/listing/ListingGallery';
import OwnerActions from '@/components/listing/OwnerActions';
import MessageSellerButton from '@/components/chat/MessageSellerButton';
import RateSellerButton from '@/components/listing/RateSellerButton';
import type { Listing, ListingPhoto, Profile, ListingStatus, Rating } from '@/types/db';

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente de revisión',
  live: 'Publicado',
  sold: 'Vendido',
  archived: 'Archivado',
  rejected: 'Rechazado',
};

const STATUS_CLASSES: Record<ListingStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-50 text-yellow-900 border border-yellow-200',
  live: 'bg-green-50 text-green-900 border border-green-200',
  sold: 'bg-muted text-muted-foreground',
  archived: 'bg-muted text-muted-foreground',
  rejected: 'bg-red-50 text-red-900 border border-red-200',
};

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  const client = createServerClient(token);
  const { data: userData } = await client.auth.getCurrentUser();
  const currentUserId = userData?.user?.id;

  const { data: listingRaw } = await client.database
    .from('listings')
    .select('id,owner_id,title,description,category,condition,visibility,is_gift,price_eur,status,rejection_reason,created_at')
    .eq('id', id)
    .single();

  if (!listingRaw) notFound();
  const listing = listingRaw as Pick<
    Listing,
    | 'id' | 'owner_id' | 'title' | 'description' | 'category'
    | 'condition' | 'visibility' | 'is_gift' | 'price_eur' | 'status'
    | 'rejection_reason' | 'created_at'
  >;

  const { data: photosRaw } = await client.database
    .from('listing_photos')
    .select('id,storage_path,sort_order')
    .eq('listing_id', id)
    .order('sort_order');

  const photos = (photosRaw ?? []) as Pick<ListingPhoto, 'id' | 'storage_path' | 'sort_order'>[];

  const { data: sellerRaw } = await client.database
    .from('profiles')
    .select('id,display_name,avatar_url,created_at')
    .eq('id', listing.owner_id)
    .single();

  const seller = sellerRaw as Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'created_at'> | null;

  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const galleryPhotos = photos.map((p) => ({
    url: `${insforgeUrl}/api/storage/buckets/listing-photos/objects/${encodeURIComponent(p.storage_path)}`,
    alt: listing.title,
  }));

  const isOwner = currentUserId === listing.owner_id;
  const status = listing.status as ListingStatus;
  const timeAgo = formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: es });
  const categoryLabels: Record<string, string> = {
    furniture: 'Muebles', kitchen: 'Cocina', electronics: 'Electrónica',
    books: 'Libros', clothes: 'Ropa', other: 'Otros',
  };
  const conditionLabels: Record<string, string> = {
    new: 'Nuevo', like_new: 'Como nuevo', used: 'Usado', worn: 'Desgastado',
  };

  // Check if the current user (buyer) has a conversation with messages → show rate CTA
  let canRateSeller = false;
  let existingRatingForSeller: Rating | null = null;

  if (!isOwner && currentUserId && seller) {
    // Eligible when: listing is sold OR buyer has exchanged at least 1 message
    if (status === 'sold') {
      canRateSeller = true;
    } else {
      const { data: conv } = await client.database
        .from('conversations')
        .select('id')
        .eq('listing_id', id)
        .eq('buyer_id', currentUserId)
        .maybeSingle();
      const convRow = conv as unknown as { id: string } | null;
      if (convRow) {
        const { count } = await client.database
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convRow.id);
        canRateSeller = (count ?? 0) > 0;
      }
    }

    if (canRateSeller) {
      const { data: myRatingRaw } = await client.database
        .from('ratings')
        .select('id,rater_id,ratee_id,listing_id,stars,comment,created_at,edit_locked_at')
        .eq('rater_id', currentUserId)
        .eq('ratee_id', seller.id)
        .eq('listing_id', id)
        .maybeSingle();
      existingRatingForSeller = myRatingRaw as unknown as Rating | null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Gallery */}
      <ListingGallery photos={galleryPhotos} />

      {/* Status badge (visible to owner or if non-live) */}
      {(isOwner || status !== 'live') && (
        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      )}

      {isOwner && (
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {listing.visibility === 'friends' ? <Users className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}
          {listing.visibility === 'friends' ? 'Solo amigos' : 'Visible para todos'}
        </span>
      )}

      {/* Rejection reason */}
      {isOwner && listing.rejection_reason && (
        <div className="flex gap-2 rounded-lg border border-destructive/30 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <div>
            <p className="text-xs font-medium text-destructive">Motivo del rechazo</p>
            <p className="text-sm">{listing.rejection_reason}</p>
          </div>
        </div>
      )}

      {/* Title + price */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
        <p className="text-2xl font-bold tabular-nums text-primary">
          {listing.is_gift ? 'Gratis' : `${listing.price_eur} €`}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {categoryLabels[listing.category] ?? listing.category}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {conditionLabels[listing.condition] ?? listing.condition}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </div>

      {/* Description */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{listing.description}</p>

      {/* Owner actions */}
      {isOwner && <OwnerActions listingId={id} status={status} />}

      {/* Seller card + message (non-owner) */}
      {!isOwner && seller && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <Link
            href={`/profile/${seller.id}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-10 w-10">
              {seller.avatar_url && (
                <AvatarImage src={seller.avatar_url} alt={seller.display_name} />
              )}
              <AvatarFallback className="bg-muted text-muted-foreground">
                {seller.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{seller.display_name}</p>
              <p className="text-xs text-muted-foreground">
                Miembro desde {formatDistanceToNow(new Date(seller.created_at), { locale: es })}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {status === 'live' && (
              <MessageSellerButton listingId={id} sellerId={seller.id} />
            )}
            {canRateSeller && (
              <RateSellerButton
                rateeId={seller.id}
                rateeName={seller.display_name}
                listingId={id}
                existingRating={existingRatingForSeller}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
