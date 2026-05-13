/**
 * Seed script — idempotent.
 * Creates Ian as an approved admin + 2 sample listings (one priced, one free).
 *
 * Usage:
 *   pnpm tsx scripts/seed.ts
 *
 * Requires INSFORGE_SERVICE_KEY and NEXT_PUBLIC_INSFORGE_URL in .env.local.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@insforge/sdk';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_INSFORGE_URL;
const serviceKey = process.env.INSFORGE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_INSFORGE_URL or INSFORGE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const SEED_EMAIL = 'ian@lodge.local';
const SEED_PASSWORD = 'Lodge2025!';
const SEED_DISPLAY_NAME = 'Ian';

const admin = createClient({ baseUrl: url, edgeFunctionToken: serviceKey });

async function getOrCreateUser(): Promise<string> {
  // Try to sign up; autoConfirm skips email verification
  const { data: signUpData, error: signUpError } = await admin.auth.signUp({
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
    name: SEED_DISPLAY_NAME,
    autoConfirm: true,
  });

  if (signUpData?.user?.id) {
    console.log(`  Created auth user: ${signUpData.user.id}`);
    return signUpData.user.id;
  }

  // User already exists — sign in to get the ID
  if (signUpError) {
    console.log(`  User already exists, signing in…`);
    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });
    if (!sessionData?.user?.id) {
      throw new Error(`Failed to sign in as seed user: ${sessionError?.message}`);
    }
    return sessionData.user.id;
  }

  throw new Error('Unexpected state: no user and no error from signUp');
}

async function upsertProfile(userId: string): Promise<void> {
  const { error } = await admin.database
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: SEED_DISPLAY_NAME,
        is_admin: true,
        is_approved: true,
      },
      { onConflict: 'id' },
    );

  if (error) throw new Error(`Failed to upsert profile: ${error.message}`);
  console.log(`  Profile upserted — is_admin=true, is_approved=true`);
}

async function seedListings(ownerId: string): Promise<void> {
  const listings = [
    {
      owner_id: ownerId,
      title: 'IKEA KALLAX Shelf Unit',
      description:
        'White 2×4 KALLAX shelf unit in good condition. A few minor scuffs on the sides but all compartments are solid. Great for books or storage boxes.',
      price_eur: 15.0,
      is_gift: false,
      category: 'furniture',
      condition: 'used',
      status: 'live',
    },
    {
      owner_id: ownerId,
      title: 'Intro to Algorithms (CLRS) — Free',
      description:
        'Third edition of the classic algorithms textbook. Some highlighting in the first few chapters but otherwise clean. Take it, no charge.',
      price_eur: null,
      is_gift: true,
      category: 'books',
      condition: 'used',
      status: 'live',
    },
  ] as const;

  for (const listing of listings) {
    // Check if a listing with the same title and owner already exists
    const { data: existing } = await admin.database
      .from('listings')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('title', listing.title)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  Listing already exists, skipping: "${listing.title}"`);
      continue;
    }

    const { error } = await admin.database.from('listings').insert(listing);
    if (error) throw new Error(`Failed to insert listing "${listing.title}": ${error.message}`);
    console.log(`  Created listing: "${listing.title}"`);
  }
}

async function main(): Promise<void> {
  console.log('Seeding Lodge Marketplace…\n');

  console.log('1. Auth user');
  const userId = await getOrCreateUser();

  console.log('2. Profile');
  await upsertProfile(userId);

  console.log('3. Sample listings');
  await seedListings(userId);

  console.log('\nDone. Ian can sign in with:');
  console.log(`  Email:    ${SEED_EMAIL}`);
  console.log(`  Password: ${SEED_PASSWORD}`);
  console.log('  (Change the password after first login.)');
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
