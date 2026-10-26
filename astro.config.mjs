// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { SITE } from './src/data/site.ts';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
const { PUBLIC_SITE_URL } = loadEnv('production', '.', 'PUBLIC_');
export default defineConfig({
  site: PUBLIC_SITE_URL || SITE.url,
  vite: {
    plugins: [tailwindcss()]
  }
});
