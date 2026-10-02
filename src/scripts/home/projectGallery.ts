import { technologyIcon } from '../../data/technologies';
import { translations } from '../../data/translations';
import { projects, type Project, type Language } from '../../data/work';

export function initProjectGallery() {
  const dialog = document.querySelector<HTMLDialogElement>('#work-modal');
  if (!dialog) return () => {};
  const modal: HTMLDialogElement = dialog;
  const abort = new AbortController();
  const signal = abort.signal;
  const body = modal.querySelector<HTMLElement>('#modal-body')!;
  const gallery = modal.querySelector<HTMLElement>('#modal-gallery')!;
  const image = modal.querySelector<HTMLImageElement>('#modal-gallery-main-img')!;
  const thumbnails = modal.querySelector<HTMLElement>('#modal-gallery-thumbs')!;
  const viewport = modal.querySelector<HTMLElement>('#modal-gallery-viewport')!;
  const zoomButton = modal.querySelector<HTMLButtonElement>('#modal-gallery-zoom')!;
  const imageError = modal.querySelector<HTMLElement>('#modal-gallery-error')!;
  const progress = modal.querySelector<HTMLElement>('#modal-gallery-progress')!;
  let zoomed = false;
  let touchStart: { x: number; y: number; id: number } | null = null;
  let activeProject: Project | null = null;
  let index = 0;
  let returnFocus: HTMLElement | null = null;
  let previousOverflow = '';
  const language = (): Language => document.documentElement.lang === 'es' ? 'es' : 'en';
  const setText = (selector: string, value: string) => {
    const el = modal.querySelector<HTMLElement>(selector);
    if (el) el.textContent = value;
  };

  function setZoom(value: boolean) {
    zoomed = value;
    viewport.classList.toggle('is-zoomed', value);
    zoomButton.setAttribute('aria-pressed', String(value));
    zoomButton.textContent = translations[language()][value ? 'work.gallery.reset' : 'work.gallery.zoom'];
    viewport.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  }
  function settleImage() {
    viewport.classList.remove('is-loading');
    imageError.hidden = image.naturalWidth > 0;
  }
  image.addEventListener('load', settleImage, { signal });
  image.addEventListener('error', settleImage, { signal });
  zoomButton.addEventListener('click', () => setZoom(!zoomed), { signal });

  function renderImage() {
    if (!activeProject?.gallery.length) return;
    const item = activeProject.gallery[index];
    const description = item.description[language()];
    setZoom(false);
    imageError.hidden = true;
    viewport.classList.add('is-loading');
    image.src = item.image;
    if (image.complete) settleImage();
    progress.style.width = `${(index + 1) / activeProject.gallery.length * 100}%`;
    image.alt = description;
    setText('#modal-gallery-context-desc', description);
    setText('#modal-gallery-counter', `${String(index + 1).padStart(2, '0')} / ${String(activeProject.gallery.length).padStart(2, '0')}`);
    thumbnails.querySelectorAll<HTMLButtonElement>('button').forEach((button, i) => {
      button.classList.toggle('is-active', i === index);
      button.setAttribute('aria-pressed', String(i === index));
      button.setAttribute('aria-label', activeProject!.gallery[i].description[language()]);
      if (i === index) {
        const left = button.offsetLeft - thumbnails.offsetLeft;
        if (left < thumbnails.scrollLeft || left + button.offsetWidth > thumbnails.scrollLeft + thumbnails.clientWidth) {
          thumbnails.scrollTo({ left: Math.max(0, left - thumbnails.clientWidth / 2 + button.offsetWidth / 2), behavior: 'instant' });
        }
      }
    });
  }

  function renderCase() {
    if (!activeProject) return;
    const lang = language();
    setText('#modal-title', activeProject.displayTitle[lang]);
    setText('#modal-short', activeProject.short[lang]);
    const cover = modal.querySelector<HTMLImageElement>('#modal-cover')!;
    cover.src = activeProject.image;
    cover.alt = activeProject.gallery[0]?.description[lang] ?? activeProject.displayTitle[lang];
    viewport.setAttribute('aria-label', lang === 'es' ? 'Imagen del proyecto' : 'Project image');
    setZoom(zoomed);
    const bullets = modal.querySelector<HTMLElement>('#modal-bullets')!;
    bullets.replaceChildren(...activeProject.bullets[lang].map(text => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));
    const tags = modal.querySelector<HTMLElement>('#modal-tags')!;
    tags.replaceChildren(...activeProject.tags.map(text => {
      const li = document.createElement('li');
      const icon = document.createElement('span');
      icon.className = 'tech-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.style.setProperty('--tech-icon', `url('${technologyIcon(text)}')`);
      const label = document.createElement('span');
      label.textContent = text;
      li.append(icon, label);
      return li;
    }));
    modal.querySelector('#modal-gallery-btn')?.toggleAttribute('hidden', !activeProject.gallery.length);
    modal.querySelector('[data-modal-close]')?.setAttribute('aria-label', lang === 'es' ? 'Cerrar proyecto' : 'Close project');
    modal.querySelector('#modal-gallery-prev')?.setAttribute('aria-label', lang === 'es' ? 'Imagen anterior' : 'Previous image');
    modal.querySelector('#modal-gallery-next')?.setAttribute('aria-label', lang === 'es' ? 'Imagen siguiente' : 'Next image');
  }

  document.querySelectorAll<HTMLButtonElement>('[data-project-open]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.projectOpen;
      if (!id || !(id in projects)) return;
      const project: Project = projects[id as keyof typeof projects];
      if (project.status === 'En desarrollo') return;
      activeProject = project;
      touchStart = null;
      returnFocus = button;
      body.hidden = false;
      gallery.hidden = true;
      index = 0;
      renderCase();
      thumbnails.replaceChildren(...project.gallery.map((item, i) => {
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'work-modal__thumb';
        thumb.dataset.index = String(i);
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = '';
        img.loading = 'lazy';
        thumb.append(img);
        thumb.setAttribute('aria-label', item.description[language()]);
        return thumb;
      }));
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      modal.showModal();
      modal.scrollTop = 0;
    }, { signal });
  });
  modal.querySelector('[data-modal-close]')?.addEventListener('click', () => modal.close(), { signal });
  modal.addEventListener('click', event => {
    // A backdrop click closes the dialog; empty space inside it does not.
    if (event.target !== modal) return;
    const bounds = modal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
  }, { signal });
  modal.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    returnFocus?.focus({ preventScroll: true });
  }, { signal });
  modal.querySelectorAll('[data-open-gallery]').forEach(button => button.addEventListener('click', () => {
    body.hidden = true;
    gallery.hidden = false;
    renderImage();
    modal.scrollTop = 0;
    modal.querySelector<HTMLButtonElement>('#modal-gallery-back')?.focus({ preventScroll: true });
  }, { signal }));
  modal.querySelector('#modal-gallery-back')?.addEventListener('click', () => {
    gallery.hidden = true;
    body.hidden = false;
    modal.querySelector<HTMLButtonElement>('#modal-gallery-btn')?.focus({ preventScroll: true });
  }, { signal });
  function navigate(direction: number) {
    const count = activeProject?.gallery.length ?? 0;
    if (!count) return;
    index = (index + direction + count) % count;
    renderImage();
  }
  modal.querySelector('#modal-gallery-prev')?.addEventListener('click', () => navigate(-1), { signal });
  modal.querySelector('#modal-gallery-next')?.addEventListener('click', () => navigate(1), { signal });
  thumbnails.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-index]');
    if (!button) return;
    index = Number(button.dataset.index);
    renderImage();
  }, { signal });
  // Keep vertical scrolling and native pinch zoom; horizontal swipes only change
  // screens when the image is not enlarged.
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || zoomed || !event.isPrimary) return;
    touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }, { signal, passive: true });
  viewport.addEventListener('pointercancel', () => { touchStart = null; }, { signal });
  viewport.addEventListener('pointerup', event => {
    if (!touchStart || event.pointerId !== touchStart.id) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (!zoomed && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) navigate(dx < 0 ? 1 : -1);
  }, { signal, passive: true });
  modal.addEventListener('keydown', event => {
    if (gallery.hidden || zoomed || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(event.key === 'ArrowRight' ? 1 : -1);
    }
  }, { signal });
  document.addEventListener('portfolio:language-change', () => {
    renderCase();
    if (!gallery.hidden) renderImage();
  }, { signal });
  return () => {
    if (modal.open) modal.close();
    abort.abort();
  };
}
