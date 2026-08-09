import { defineCollection, z } from 'astro:content';

const dummy = defineCollection({
  loader: () => [{ id: '1' }],
  schema: z.object({
    id: z.string(),
  }),
});

export const collections = { dummy };
