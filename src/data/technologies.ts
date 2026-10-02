// Brand SVGs: Devicon v2.17.0 (MIT). Concept symbols are original line drawings.
export const technologyIcons: Record<string, string> = {
  'Node.js': 'nodejs', TypeScript: 'typescript', Express: 'express',
  PostgreSQL: 'postgresql', MongoDB: 'mongodb', Vitest: 'vitest',
  Docker: 'docker', Git: 'git', 'GitHub Actions': 'githubactions',
  'Next.js': 'nextjs', 'Prisma ORM': 'prisma', Astro: 'astro', SCSS: 'sass',
  'Three.js': 'threejs', React: 'react', Redis: 'redis',
  'REST APIs': 'api', PWA: 'app', WebSockets: 'connection',
  'Cron Jobs': 'clock', 'State Machines': 'states',
};

export function technologyIcon(name: string): string {
  const icon = technologyIcons[name];
  if (!icon) throw new Error(`Missing technology icon: ${name}`);
  return `/assets/technologies/${icon}.svg`;
}
