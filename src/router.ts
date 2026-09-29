// Minimal hash router: #/learn, #/lesson/<id>, #/play, ...
export type View = { el: HTMLElement; destroy?: () => void; title?: string };
type Handler = (params: string[]) => View | Promise<View>;

const routes: { re: RegExp; handler: Handler }[] = [];
let current: View | null = null;
let onChange: ((path: string) => void) | null = null;

export function route(pattern: string, handler: Handler) {
  const re = new RegExp('^' + pattern.replace(/:\w+/g, '([^/]+)') + '$');
  routes.push({ re, handler });
}

export function go(path: string) {
  if (location.hash !== '#' + path) location.hash = path;
  else void render();
}

export function currentPath() {
  return location.hash.slice(1) || '/';
}

export function onRoute(fn: (path: string) => void) {
  onChange = fn;
}

async function render() {
  const path = currentPath();
  const main = document.getElementById('main')!;
  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    current?.destroy?.();
    current = null;
    const view = await r.handler(m.slice(1).map(decodeURIComponent));
    main.replaceChildren(view.el);
    main.scrollTop = 0;
    window.scrollTo(0, 0);
    current = view;
    onChange?.(path);
    return;
  }
  go('/');
}

export function startRouter() {
  addEventListener('hashchange', () => void render());
  void render();
}
