import { translations } from '../../data/translations';
import { canReserve } from './reservationRules';

/** The example is local and illustrative; it does not submit or reserve real inventory. */
export function initReservationDemo(root: HTMLElement | null) {
  if (!root) return () => {};
  const events = new AbortController();
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-logic-stock]')];
  const stockValue = root.querySelector<HTMLElement>('[data-logic-stock-value]');
  const feedback = root.querySelector<HTMLElement>('[data-logic-feedback]');
  let stock = 8;

  function render() {
    const allowed = canReserve(stock, 3);
    root!.dataset.logicResult = allowed ? 'allowed' : 'blocked';
    root!.querySelectorAll<HTMLElement>('[data-logic-outcome]').forEach(outcome => {
      outcome.setAttribute('aria-hidden', String(outcome.dataset.logicOutcome !== root!.dataset.logicResult));
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.logicStock) === stock)));
    if (stockValue) stockValue.textContent = String(stock);
    if (feedback) {
      const key = allowed ? 'aboutScene.logic.allowedFeedback' : 'aboutScene.logic.blockedFeedback';
      const lang = document.documentElement.lang === 'en' ? 'en' : 'es';
      feedback.dataset.i18n = key;
      feedback.textContent = translations[lang][key];
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    stock = Number(button.dataset.logicStock);
    render();
  }, { signal: events.signal }));
  document.addEventListener('portfolio:language-change', render, { signal: events.signal });
  render();
  return () => events.abort();
}
