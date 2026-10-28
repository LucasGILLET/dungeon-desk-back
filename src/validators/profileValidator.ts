import { z } from 'zod';

// Pseudo affiché aux autres joueurs (campagnes) : lettres, chiffres, espaces et « _ - . ' »
export const profileInputSchema = z.object({
  username: z.string()
    .transform((s) => s.trim().replace(/\s+/g, ' '))
    .pipe(z.string()
      .min(3, 'Le pseudo doit faire au moins 3 caractères')
      .max(30, 'Le pseudo doit faire au plus 30 caractères')
      .regex(/^[\p{L}\p{N} _.'-]+$/u, 'Lettres, chiffres, espaces et _ - . \' seulement')),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
