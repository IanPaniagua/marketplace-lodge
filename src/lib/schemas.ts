import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  display_name: z.string().min(2).max(40),
  accept_privacy: z.literal(true, {
    message: 'You must accept the Privacy Policy.',
  }),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const VerifyEmailSchema = z.object({
  otp: z.string().length(6, 'Code must be 6 digits'),
});

// Fields-only schema (photos handled separately in the component)
export const ListingFieldsSchema = z
  .object({
    title: z.string().min(3, 'At least 3 characters').max(80, 'Max 80 characters'),
    description: z
      .string()
      .min(10, 'At least 10 characters')
      .max(2000, 'Max 2000 characters'),
    category: z.enum([
      'furniture',
      'kitchen',
      'electronics',
      'books',
      'clothes',
      'other',
    ]),
    condition: z.enum(['new', 'like_new', 'used', 'worn']),
    is_gift: z.boolean(),
    price_eur: z.number().nonnegative('Price must be 0 or more').nullable(),
  })
  .refine((d) => (d.is_gift ? d.price_eur === null : d.price_eur !== null), {
    message: 'Set a price or mark as free',
    path: ['price_eur'],
  });

export const ListingSchema = z
  .object({
    title: z.string().min(3).max(80),
    description: z.string().min(10).max(2000),
    category: z.enum(['furniture', 'kitchen', 'electronics', 'books', 'clothes', 'other']),
    condition: z.enum(['new', 'like_new', 'used', 'worn']),
    is_gift: z.boolean(),
    price_eur: z.number().nonnegative().nullable(),
    photos: z.array(z.instanceof(File)).min(1).max(5),
  })
  .refine((d) => (d.is_gift ? d.price_eur === null : d.price_eur !== null), {
    message: 'Set a price or mark as gift',
  });

export const MessageSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type MessageInput = z.infer<typeof MessageSchema>;

export const RatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(280).optional(),
});

export const ProfileEditSchema = z.object({
  display_name: z.string().min(2).max(40),
  bio: z.string().max(200).optional(),
  room_number: z.string().max(10).optional(),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type ProfileEditInput = z.infer<typeof ProfileEditSchema>;
export type ListingFieldsInput = z.infer<typeof ListingFieldsSchema>;
