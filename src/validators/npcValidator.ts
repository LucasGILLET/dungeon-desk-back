import { z } from 'zod';

export const createNpcSchema = z.object({
  name: z.string().min(1),
  race: z.string().min(1),
  class: z.string().optional().nullable(),
  data: z.record(z.string(), z.any()),
});
