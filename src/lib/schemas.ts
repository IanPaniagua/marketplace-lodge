import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  display_name: z.string().min(2).max(40),
  accept_privacy: z.literal(true, {
    message: 'Debes aceptar la Política de privacidad.',
  }),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const VerifyEmailSchema = z.object({
  otp: z.string().length(6, 'El código debe tener 6 dígitos'),
});

// Fields-only schema (photos handled separately in the component)
export const ListingFieldsSchema = z
  .object({
    title: z.string().min(3, 'Mínimo 3 caracteres').max(80, 'Máximo 80 caracteres'),
    description: z
      .string()
      .max(2000, 'Máximo 2000 caracteres'),
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
    price_eur: z.number().nonnegative('El precio debe ser 0 o superior').nullable(),
  })
  .refine((d) => (d.is_gift ? d.price_eur === null : d.price_eur !== null), {
    message: 'Indica un precio o marca el artículo como gratis',
    path: ['price_eur'],
  });

export const ListingSchema = z
  .object({
    title: z.string().min(3).max(80),
    description: z.string().max(2000),
    category: z.enum(['furniture', 'kitchen', 'electronics', 'books', 'clothes', 'other']),
    condition: z.enum(['new', 'like_new', 'used', 'worn']),
    is_gift: z.boolean(),
    price_eur: z.number().nonnegative().nullable(),
    photos: z.array(z.instanceof(File)).min(1).max(5),
  })
  .refine((d) => (d.is_gift ? d.price_eur === null : d.price_eur !== null), {
    message: 'Indica un precio o marca el artículo como regalo',
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
