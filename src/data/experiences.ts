export type GalleryLanguage = 'es' | 'en';

/** These are original studies for testing the journey, never client projects. */
export const galleryWorks = [
  { id: 'umbral', number: '01', title: { es: 'Umbral', en: 'Threshold' }, description: { es: 'Una primera exploración de la luz, el espacio y lo que queda al otro lado.', en: 'A first exploration of light, space and what lies on the other side.' }, color: '#d9ccb4' },
  { id: 'materia', number: '02', title: { es: 'Materia', en: 'Matter' }, description: { es: 'Formas sencillas, superficies imperfectas y un lugar para detener la mirada.', en: 'Simple forms, imperfect surfaces and a place for the eye to rest.' }, color: '#a8afa3' },
  { id: 'cadencia', number: '03', title: { es: 'Cadencia', en: 'Cadence' }, description: { es: 'Un estudio del ritmo: líneas que encuentran su lugar sin necesidad de prisa.', en: 'A study of rhythm: lines finding their place without the need to hurry.' }, color: '#a8bec7' },
] as const;

export const experiences = {
  es: {
    title: 'Experiencias web — Ariel Morillo',
    description: 'Una puerta sobre el agua y una galería de experiencias web de Ariel Morillo.',
    back: 'Volver', label: 'Experiencias web',
    heading: 'Hay otras formas\nde sentir la web.',
    introduction: 'A veces, una página te invita a detenerte. Y algo de esa calma se queda contigo.',
    enter: 'Entrar a la galería', language: 'Cambiar a inglés',
    loading: 'Preparando el espacio…', ready: 'La puerta está abierta a la curiosidad.',
    collectionTitle: 'Una colección\npor descubrir.',
    collectionIntro: 'Tres estudios para imaginar lo que puede llegar a ser una experiencia web.',
    scroll: 'Desliza para recorrer', navigation: 'Elegir una obra', goTo: 'Ir a la obra',
    prototype: 'Obra de prueba', open: 'Ver experiencia', close: 'Volver a la galería',
    preview: 'Vista previa', newTab: 'Abrir en otra pestaña',
    endTitle: '¿Creamos tu próxima\nexperiencia web?',
    endBody: 'Esta colección está empezando. La próxima pieza puede comenzar con tu idea.',
    contact: 'Hablemos de tu idea', replay: 'Volver a recorrer',
    soundStart: 'Activar sonido', soundPause: 'Pausar sonido', soundResume: 'Reanudar sonido',
    soundUnavailable: 'El sonido no está disponible en este navegador.',
    fallback: 'Puedes explorar todas las piezas sin el recorrido 3D.',
    demoLabel: 'Página de prueba', demoBody: 'Este espacio está reservado para una futura experiencia web. Por ahora, permite probar el recorrido y el regreso a la galería.',
  },
  en: {
    title: 'Web experiences — Ariel Morillo',
    description: 'A door on the water and a gallery of web experiences by Ariel Morillo.',
    back: 'Back', label: 'Web experiences',
    heading: 'There are other ways\nto feel the web.',
    introduction: 'Sometimes, a page invites you to pause. And a little of that calm stays with you.',
    enter: 'Enter the gallery', language: 'Switch to Spanish',
    loading: 'Preparing the space…', ready: 'The door is open to curiosity.',
    collectionTitle: 'A collection\nto discover.',
    collectionIntro: 'Three studies to imagine what a web experience could become.',
    scroll: 'Scroll to explore', navigation: 'Choose a work', goTo: 'Go to work',
    prototype: 'Prototype work', open: 'View experience', close: 'Back to the gallery',
    preview: 'Preview', newTab: 'Open in another tab',
    endTitle: 'Shall we create your next\nweb experience?',
    endBody: 'This collection is just beginning. The next piece could start with your idea.',
    contact: "Let's talk about your idea", replay: 'Explore again',
    soundStart: 'Enable sound', soundPause: 'Pause sound', soundResume: 'Resume sound',
    soundUnavailable: 'Sound is unavailable in this browser.',
    fallback: 'You can explore every work without the 3D journey.',
    demoLabel: 'Test page', demoBody: 'This space is reserved for a future web experience. For now, it lets you test the journey and return to the gallery.',
  },
} as const;

export function getGalleryWork(id: string) { return galleryWorks.find(work => work.id === id); }
