/** Small, optional entrance effects for content that enters the viewport. */
export function installMotion(root: HTMLElement): void {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selector = [
    '.marketing-page .section-intro',
    '.marketing-page .step-card',
    '.marketing-page .talent-visual',
    '.marketing-page .talent-section .audience-copy',
    '.marketing-page .teams-section .audience-copy',
    '.marketing-page .teams-visual',
    '.marketing-page .faq-section > div',
    '.marketing-page .closing-content',
    '.marketing-page .footer-top',
    '.app-shell .main .stat-row',
    '.app-shell .main .panel'
  ].join(',');
  let intersection: IntersectionObserver | undefined;
  let mutations: MutationObserver | undefined;
  let seen = new WeakSet<Element>();

  const reveal = (element: Element) => {
    element.classList.remove('motion-pending');
    element.classList.add('motion-shown');
    intersection?.unobserve(element);
  };
  const register = (element: Element) => {
    if (!intersection || seen.has(element)) return;
    seen.add(element);
    const bounds = element.getBoundingClientRect();
    // Content already on screen must remain ready to use, including on route changes.
    if (bounds.top < window.innerHeight - 24 && bounds.bottom > 0) return;
    element.classList.add('motion-reveal', 'motion-pending');
    intersection.observe(element);
  };
  const scan = (node: Node) => {
    if (!(node instanceof Element)) return;
    if (node.matches(selector)) register(node);
    node.querySelectorAll(selector).forEach(register);
  };
  const stop = () => {
    mutations?.disconnect();
    intersection?.disconnect();
    mutations = undefined;
    intersection = undefined;
    root.querySelectorAll('.motion-pending').forEach(reveal);
  };
  const start = () => {
    if (preference.matches || !('IntersectionObserver' in window)) return;
    seen = new WeakSet<Element>();
    intersection = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    scan(root);
    mutations = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(scan);
        record.removedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches(selector)) intersection?.unobserve(node);
          node.querySelectorAll(selector).forEach(element => intersection?.unobserve(element));
        });
      }
    });
    mutations.observe(root, { childList: true, subtree: true });
  };
  preference.addEventListener('change', () => { stop(); start(); });
  document.addEventListener('focusin', event => {
    if (!(event.target instanceof Element)) return;
    const parent = event.target.closest('.motion-pending');
    if (parent) reveal(parent);
  });
  start();
}

