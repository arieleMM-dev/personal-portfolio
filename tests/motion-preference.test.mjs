import assert from 'node:assert/strict';
import test from 'node:test';
import { initMotionPreference, isAmbientPaused } from '../src/scripts/motion.ts';

function environment(storage) {
  const label = { textContent: '' };
  const button = Object.assign(new EventTarget(), {
    hidden: false, attributes: new Map(),
    setAttribute(key, value) { this.attributes.set(key, value); },
    querySelector() { return label; },
  });
  const media = Object.assign(new EventTarget(), { matches: false });
  const document = Object.assign(new EventTarget(), {
    documentElement: { dataset: {}, lang: 'es' },
    querySelector() { return button; },
  });
  const values = { document, localStorage: storage, matchMedia: () => media };
  const originals = new Map(Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.entries(values).forEach(([key, value]) => Object.defineProperty(globalThis, key, { configurable: true, value }));
  return { button, media, document, label, restore() {
    originals.forEach((descriptor, key) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  } };
}

test('ambient pause restores preference, translates controls and releases listeners', () => {
  const data = new Map([['portfolio-motion', 'paused']]);
  const env = environment({ getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) });
  let destroy;
  try {
    let notifications = 0;
    env.document.addEventListener('portfolio:motion-change', () => notifications++);
    destroy = initMotionPreference();
    assert.equal(isAmbientPaused(), true);
    assert.equal(env.label.textContent, 'Reanudar ambiente');
    env.button.dispatchEvent(new Event('click'));
    assert.equal(isAmbientPaused(), false);
    assert.equal(data.get('portfolio-motion'), 'running');
    assert.equal(notifications, 1);
    env.document.documentElement.lang = 'en';
    env.document.dispatchEvent(new Event('portfolio:language-change'));
    assert.equal(env.label.textContent, 'Pause atmosphere');
    env.media.matches = true;
    env.media.dispatchEvent(new Event('change'));
    assert.equal(env.button.hidden, true);
    destroy();
    env.button.dispatchEvent(new Event('click'));
    assert.equal(isAmbientPaused(), false);
  } finally { destroy?.(); env.restore(); }
});

test('blocked storage does not prevent pausing or updating the control', () => {
  const env = environment({ getItem() { throw new Error('Storage blocked'); }, setItem() { throw new Error('Storage blocked'); } });
  let destroy;
  try {
    destroy = initMotionPreference();
    env.button.dispatchEvent(new Event('click'));
    assert.equal(isAmbientPaused(), true);
    assert.equal(env.button.attributes.get('aria-pressed'), 'true');
    assert.equal(env.label.textContent, 'Reanudar ambiente');
  } finally { destroy?.(); env.restore(); }
});
