export const TECH_COLORS: Record<string, string> = {
  'TypeScript': '#3178C6',
  'JavaScript': '#F7DF1E',
  'Python': '#3776AB',
  'Node.js': '#339933',
  'Express': '#ffffff',
  'Next.js': '#ffffff',
  'REST APIs': '#4DB6AC',
  'PostgreSQL': '#336791',
  'MongoDB': '#47A248',
  'SQL': '#F29111',
  'Prisma ORM': '#ffffff',
  'SQL Server': '#CC292B',
  'GitHub Actions': '#2088FF',
  'Docker': '#2496ED',
  'Jest': '#C21325',
  'Vitest': '#FCC72B',
  'k6': '#7D64FF',
  'Power BI': '#F2C811',
  'Pentaho': '#ffffff',
  'SOLID': '#82AAFF',
  'Clean Code': '#C3E88D',
  'Scrum': '#F06622',
  'Kanban': '#2684FF',
  'Jira': '#0052CC',
};

export const CONCEPT_COLOR = '#F3F4F6';

export const columns = [
  {
    index: '01',
    titleKey: 'expertise.col1.title',
    descKey: 'expertise.col1.desc',
    techs: ['TypeScript', 'JavaScript', 'Python', 'Node.js', 'Express', 'Next.js', 'REST APIs', 'PostgreSQL', 'MongoDB', 'SQL'],
    className: 'expertise__column--full'
  },
  {
    index: '02',
    titleKey: 'expertise.col2.title',
    descKey: 'expertise.col2.desc',
    techs: ['Prisma ORM', 'SQL Server', 'GitHub Actions', 'Docker', 'Jest', 'Vitest', 'k6', 'Power BI', 'Pentaho'],
  },
  {
    index: '03',
    titleKey: 'expertise.col3.title',
    descKey: 'expertise.col3.desc',
    techs: ['SOLID', 'Clean Code', 'Scrum', 'Kanban', 'Jira'],
  },
];
