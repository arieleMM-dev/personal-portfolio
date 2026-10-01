export type Language = 'es' | 'en';
export type LocalizedText = Record<Language, string>;
export interface GalleryItem { image: string; description: LocalizedText }
export interface Project {
  title: string;
  displayTitle: LocalizedText;
  status: 'Completado' | 'En desarrollo';
  image: string;
  short: LocalizedText;
  bullets: Record<Language, string[]>;
  gallery: GalleryItem[];
  tags: string[];
  problem?: LocalizedText;
  result?: LocalizedText;
}

export const projects = {
  "jirah": {
    "title": "Plataforma de Gestión Agrícola - Finca Jirah",
    "status": "Completado",
    "image": "/assets/jirah/dashboard.jpg",
    "short": {
      "es": "Sistema Fullstack offline-first para la trazabilidad en tiempo real de la cadena de producción agrícola.",
      "en": "Offline-first Fullstack system for real-time traceability of the agricultural production chain."
    },
    "bullets": {
      "es": [
        "Diseño de arquitectura y modelado relacional con Prisma ORM.",
        "Desarrollo de API REST nativa en entorno Next.js/Node.js.",
        "Arquitectura Offline-First (PWA) con IndexedDB para sincronización diferida en zonas rurales."
      ],
      "en": [
        "Architecture design and relational modeling with Prisma ORM.",
        "Native REST API development in a Next.js/Node.js environment.",
        "Offline-First architecture (PWA) using IndexedDB for deferred synchronization in rural areas."
      ]
    },
    "gallery": [
      {
        "image": "/assets/jirah/dashboard.jpg",
        "description": {
          "es": "Dashboard principal de monitoreo agrícola en tiempo real.",
          "en": "Main dashboard for agricultural operations."
        }
      },
      {
        "image": "/assets/jirah/clasificacion.jpg",
        "description": {
          "es": "Módulo de clasificación y control de calidad de productos.",
          "en": "Product classification and quality control."
        }
      },
      {
        "image": "/assets/jirah/pesaje.jpg",
        "description": {
          "es": "Registro y control de pesaje de recolección agrícola.",
          "en": "Harvest weight recording."
        }
      },
      {
        "image": "/assets/jirah/personal.jpg",
        "description": {
          "es": "Gestión de recursos humanos y personal de campo.",
          "en": "Workforce management."
        }
      },
      {
        "image": "/assets/jirah/catalogos.jpg",
        "description": {
          "es": "Gestión centralizada de catálogos y entidades del sistema.",
          "en": "Shared system catalogs."
        }
      },
      {
        "image": "/assets/jirah/perfil.jpg",
        "description": {
          "es": "Administración de perfil de usuario y preferencias.",
          "en": "User profile management."
        }
      },
      {
        "image": "/assets/jirah/login.jpg",
        "description": {
          "es": "Pantalla de autenticación y control de acceso al sistema.",
          "en": "Authentication and access."
        }
      }
    ],
    "tags": [
      "TypeScript",
      "Node.js",
      "Next.js",
      "Prisma ORM",
      "PostgreSQL",
      "PWA"
    ],
    "displayTitle": {
      "es": "Finca Jirah",
      "en": "Finca Jirah"
    },
    "problem": {
      "es": "La producción agrícola necesita registrar pesajes, clasificación y personal, incluso cuando la conexión a internet no es estable.",
      "en": "Agricultural production needs weight, classification and workforce records, even when an internet connection is unreliable."
    },
    "result": {
      "es": "Una plataforma que integra las operaciones de la finca con persistencia local y sincronización diferida para continuar el trabajo sin conexión.",
      "en": "A platform that brings farm operations together with local persistence and deferred synchronization to support work offline."
    }
  },
  "portfolio": {
    "title": "Portafolio Web Cinemático",
    "status": "Completado",
    "image": "/assets/portfolio/hero-refresh.jpg",
    "short": {
      "es": "Desarrollo de portafolio interactivo priorizando rendimiento, animaciones avanzadas y código modular.",
      "en": "Interactive portfolio development prioritizing performance, advanced animations, and modular code."
    },
    "bullets": {
      "es": [
        "Renderizado estático con Astro y carga modular de la escena Three.js.",
        "Cubo instanciado con proyección de video, deformación y ondas interactivas.",
        "Animaciones de scroll, navegación por teclado y adaptación a movimiento reducido."
      ],
      "en": [
        "Static rendering with Astro and modular loading of the Three.js scene.",
        "Instanced cube with video projection, deformation and interactive ripples.",
        "Scroll animations, keyboard navigation and reduced-motion adaptations."
      ]
    },
    "gallery": [
      {
        "image": "/assets/portfolio/hero-refresh.jpg",
        "description": {
          "es": "Océano digital: agua, ciudad distante y un cubo de video interactivo.",
          "en": "Digital ocean: water, distant cityscape and an interactive video cube."
        }
      },
      {
        "image": "/assets/portfolio/about-refresh.jpg",
        "description": {
          "es": "Perfil y explorador de las capas de un sistema.",
          "en": "Profile and interactive system-layer explorer."
        }
      },
      {
        "image": "/assets/portfolio/knowledge-refresh.jpg",
        "description": {
          "es": "Capacidades técnicas organizadas por desarrollo, datos y entrega.",
          "en": "Technical capabilities organized by development, data and delivery."
        }
      },
      {
        "image": "/assets/portfolio/projects-refresh.jpg",
        "description": {
          "es": "Proyectos destacados y casos de estudio.",
          "en": "Featured projects and case studies."
        }
      },
      {
        "image": "/assets/portfolio/contact-refresh.jpg",
        "description": {
          "es": "Contacto y cierre visual del recorrido.",
          "en": "Contact and visual closing of the experience."
        }
      }
    ],
    "tags": [
      "Astro",
      "TypeScript",
      "SCSS",
      "GSAP",
      "WebGL"
    ],
    "displayTitle": {
      "es": "Océano digital",
      "en": "Digital ocean"
    },
    "problem": {
      "es": "Presentar mi trabajo técnico en una experiencia propia, con una escena interactiva que conviva con contenido legible y navegación fluida.",
      "en": "Present my technical work through a distinctive experience, with an interactive scene alongside readable content and smooth navigation."
    },
    "result": {
      "es": "Un portafolio bilingüe con un cubo instanciado, proyección de video, agua reflectante y contenido organizado por componentes.",
      "en": "A bilingual portfolio with an instanced cube, video projection, reflective water and content organized into components."
    }
  },
  "pos": {
    "title": "POS & Inventario Multi-Sucursal",
    "status": "En desarrollo",
    "image": "/assets/desarrollo/desarrollo.png",
    "short": {
      "es": "Sistema de punto de venta en tiempo real con WebSockets. Gestión de concurrencia de stock y sincronización distribuida entre múltiples sucursales.",
      "en": "Real-time point of sale system with WebSockets. Stock concurrency management and distributed synchronization across multiple branches."
    },
    "bullets": {
      "es": [],
      "en": []
    },
    "gallery": [],
    "tags": [
      "WebSockets",
      "Node.js",
      "Redis",
      "React"
    ],
    "displayTitle": {
      "es": "POS multi-sucursal",
      "en": "Multi-branch POS"
    }
  },
  "helpdesk": {
    "title": "Mesa de Ayuda & SLA Automático",
    "status": "En desarrollo",
    "image": "/assets/desarrollo/desarrollo.png",
    "short": {
      "es": "Plataforma de ticketing con máquinas de estado. Temporizadores en segundo plano para el cumplimiento de Acuerdos de Nivel de Servicio (SLA) y flujos de escalamiento automático.",
      "en": "Ticketing platform with state machines. Background timers for Service Level Agreement (SLA) compliance and automated escalation flows."
    },
    "bullets": {
      "es": [],
      "en": []
    },
    "gallery": [],
    "tags": [
      "Cron Jobs",
      "PostgreSQL",
      "State Machines",
      "Next.js"
    ],
    "displayTitle": {
      "es": "Mesa de ayuda & SLA",
      "en": "Help desk & SLA"
    }
  }
} satisfies Record<string, Project>;

