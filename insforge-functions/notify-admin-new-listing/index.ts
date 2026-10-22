import { createClient } from 'npm:@insforge/sdk';

const BASE_URL = Deno.env.get('INSFORGE_BASE_URL') ?? Deno.env.get('INSFORGE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('API_KEY') ?? Deno.env.get('INSFORGE_SERVICE_KEY') ?? '';

export default async function handler(req: Request): Promise<Response> {
  const body = await req.json() as { listing_id?: string };
  const { listing_id } = body;
  if (!listing_id) {
    return new Response(JSON.stringify({ error: 'Missing listing_id' }), { status: 400 });
  }

  const client = createClient({ baseUrl: BASE_URL, edgeFunctionToken: SERVICE_KEY });

  // Fetch listing + owner profile
  const { data: listingRaw } = await client.database
    .from('listings')
    .select('id,title,owner_id,category,price_eur,is_gift')
    .eq('id', listing_id)
    .single();

  if (!listingRaw) {
    return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404 });
  }

  const listing = listingRaw as {
    id: string;
    title: string;
    owner_id: string;
    category: string;
    price_eur: number | null;
    is_gift: boolean;
  };

  const { data: ownerRaw } = await client.database
    .from('profiles')
    .select('display_name')
    .eq('id', listing.owner_id)
    .single();

  const owner = ownerRaw as { display_name: string } | null;

  // Fetch all admin emails
  const { data: adminsRaw } = await client.database
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .is('deleted_at', null);

  const adminIds = ((adminsRaw ?? []) as Array<{ id: string }>).map((a) => a.id);
  if (adminIds.length === 0) {
    return new Response(JSON.stringify({ sent: false, reason: 'No admins' }), { status: 200 });
  }

  // Fetch auth emails for admin IDs via admin SDK
  // Insforge doesn't expose auth user emails through the database; we use the admin API.
  // Send one email per admin by calling the emails API.
  const price = listing.is_gift ? 'Free' : `€${listing.price_eur}`;
  const subject = `New listing pending review: ${listing.title}`;
  const html = `
    <p>A new listing has been submitted and needs your review.</p>
    <ul>
      <li><strong>Title:</strong> ${listing.title}</li>
      <li><strong>Category:</strong> ${listing.category}</li>
      <li><strong>Price:</strong> ${price}</li>
      <li><strong>Seller:</strong> ${owner?.display_name ?? 'Unknown'}</li>
    </ul>
    <p><a href="${BASE_URL}/admin/listings">Review in admin panel →</a></p>
  `;

  // Use the Insforge emails API
  const ADMIN_EMAIL = Deno.env.get('ADMIN_NOTIFICATION_EMAIL');
  if (!ADMIN_EMAIL) {
    return new Response(JSON.stringify({ sent: false, reason: 'No admin email configured' }), { status: 200 });
  }

  await client.emails.send({
    to: ADMIN_EMAIL,
    subject,
    html,
  });

  return new Response(JSON.stringify({ sent: true }), { status: 200 });
}
