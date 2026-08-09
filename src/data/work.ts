export const projects = {
  jirah: {
    title: 'Plataforma de Gestión Agrícola - Finca Jirah',
    status: 'Completado',
    image: '/assets/jirah/jirah.jpg',
    short: {
      es: 'Sistema Fullstack offline-first para la trazabilidad en tiempo real de la cadena de producción agrícola.',
      en: 'Offline-first Fullstack system for real-time traceability of the agricultural production chain.'
    },
    bullets: {
      es: [
        "Diseño de arquitectura y modelado relacional con Prisma ORM.", 
        "Desarrollo de API REST nativa en entorno Next.js/Node.js.", 
        "Arquitectura Offline-First (PWA) con IndexedDB para sincronización diferida en zonas rurales."
      ],
      en: [
        "Architecture design and relational modeling with Prisma ORM.", 
        "Native REST API development in a Next.js/Node.js environment.", 
        "Offline-First architecture (PWA) using IndexedDB for deferred synchronization in rural areas."
      ]
    },
    gallery: [
      { image: '/assets/jirah/dashboard.jpg', description: 'Dashboard principal de monitoreo agrícola en tiempo real.' },
      { image: '/assets/jirah/clasificacion.jpg', description: 'Módulo de clasificación y control de calidad de productos.' },
      { image: '/assets/jirah/pesaje.jpg', description: 'Registro y control de pesaje de recolección agrícola.' },
      { image: '/assets/jirah/personal.jpg', description: 'Gestión de recursos humanos y personal de campo.' },
      { image: '/assets/jirah/catalogos.jpg', description: 'Gestión centralizada de catálogos y entidades del sistema.' },
      { image: '/assets/jirah/perfil.jpg', description: 'Administración de perfil de usuario y preferencias.' },
      { image: '/assets/jirah/login.jpg', description: 'Pantalla de autenticación y control de acceso al sistema.' },
    ],
    tags: ['TypeScript', 'Node.js', 'Next.js', 'Prisma ORM', 'PostgreSQL', 'PWA']
  },
  portfolio: {
    title: 'Portafolio Web Cinemático',
    status: 'Completado',
    image: '/assets/portfolio/portfolio.jpg',
    short: {
      es: 'Desarrollo de portafolio interactivo priorizando rendimiento, animaciones avanzadas y código modular.',
      en: 'Interactive portfolio development prioritizing performance, advanced animations, and modular code.'
    },
    bullets: {
      es: [
        "Renderizado estático y optimización de carga con Astro Islands.", 
        "Animaciones complejas y control de scroll con GSAP.", 
        "Estructuración limpia y tipado estricto con TypeScript y SCSS."
      ],
      en: [
        "Static rendering and load optimization with Astro Islands.", 
        "Complex animations and scroll control with GSAP.", 
        "Clean structuring and strict typing with TypeScript and SCSS."
      ]
    },
    gallery: [
      { image: '/assets/portfolio/hero.jpg', description: 'Hero section cinemático con Canvas interactivo.' },
      { image: '/assets/portfolio/proyecto.jpg', description: 'Presentación detallada de casos de estudio y proyectos destacados.' },
      { image: '/assets/portfolio/experiencia.jpg', description: 'Timeline interactivo detallando la trayectoria y experiencia profesional.' },
      { image: '/assets/portfolio/conocimientos.jpg', description: 'Visualización de habilidades técnicas y stack de desarrollo.' },
      { image: '/assets/portfolio/about.jpg', description: 'Sección sobre mí con información personal y enfoque profesional.' },
      { image: '/assets/portfolio/contacto.jpg', description: 'Sección de contacto y enlaces a redes profesionales.' },
    ],
    tags: ['Astro', 'TypeScript', 'SCSS', 'GSAP', 'WebGL']
  },
  pos: {
    title: 'POS & Inventario Multi-Sucursal',
    status: 'En desarrollo',
    image: '/assets/desarrollo/desarrollo.png',
    short: {
      es: 'Sistema de punto de venta en tiempo real con WebSockets. Gestión de concurrencia de stock y sincronización distribuida entre múltiples sucursales.',
      en: 'Real-time point of sale system with WebSockets. Stock concurrency management and distributed synchronization across multiple branches.'
    },
    bullets: {
      es: [],
      en: []
    },
    gallery: [
      { image: '/assets/pos/system.jpg', description: 'Interfaz táctil para facturación en sucursal.' },
      { image: '/assets/pos/sync.jpg', description: 'Sincronización WebSocket de inventario.' },
    ],
    tags: ['WebSockets', 'Node.js', 'Redis', 'React']
  },
  helpdesk: {
    title: 'Mesa de Ayuda & SLA Automático',
    status: 'En desarrollo',
    image: '/assets/desarrollo/desarrollo.png',
    short: {
      es: 'Plataforma de ticketing con máquinas de estado. Temporizadores en segundo plano para el cumplimiento de Acuerdos de Nivel de Servicio (SLA) y flujos de escalamiento automático.',
      en: 'Ticketing platform with state machines. Background timers for Service Level Agreement (SLA) compliance and automated escalation flows.'
    },
    bullets: {
      es: [],
      en: []
    },
    gallery: [
      { image: '/assets/helpdesk/tickets.jpg', description: 'Bandeja de tickets unificada.' },
      { image: '/assets/helpdesk/sla.jpg', description: 'Flujos automatizados de escalamiento (SLA).' },
    ],
    tags: ['Cron Jobs', 'PostgreSQL', 'State Machines', 'Next.js']
  }
};

