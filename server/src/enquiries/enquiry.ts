import { z } from 'zod';

export const enquirySchema = z.object({
  productId: z.number().int().positive(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).regex(/^[0-9+() .-]*$/, 'Enter a valid phone number').optional(),
  message: z.string().trim().max(2000).optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
