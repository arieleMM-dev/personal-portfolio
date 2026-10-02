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
}

export const projects = {
  "jirah": {
    "title": "Plataforma de Gestión Agrícola - Finca Jirah",
    "status": "Completado",
    "image": "/assets/jirah/dashboard.jpg",
    "short": {
      "es": "Software desarrollado para Finca Jirah, una finca real en Pedro Vicente Maldonado, Ecuador. Una plataforma fullstack offline-first para registrar y conectar su producción agrícola.",
      "en": "Software developed for Finca Jirah, a real farm in Pedro Vicente Maldonado, Ecuador. An offline-first fullstack platform to record and connect its agricultural production."
    },
    "bullets": {
      "es": [
        "Modelado relacional con Prisma y PostgreSQL.",
        "API REST y lógica de negocio con Node.js / Next.js.",
        "Trabajo sin conexión y sincronización diferida con IndexedDB."
      ],
      "en": [
        "Relational modeling with Prisma and PostgreSQL.",
        "REST API and business logic with Node.js / Next.js.",
        "Offline work and deferred synchronization with IndexedDB."
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
          "es": "Base backend: desarrollo, datos y pruebas, arquitectura y sistemas.",
          "en": "Backend foundations: development, data and testing, architecture and systems."
        }
      },
      {
        "image": "/assets/portfolio/projects-refresh.jpg",
        "description": {
          "es": "Proyectos destacados y su aportación técnica.",
          "en": "Featured projects and their technical contributions."
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
      "Three.js",
      "SCSS"
    ],
    "displayTitle": {
      "es": "Océano digital",
      "en": "Digital ocean"
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

