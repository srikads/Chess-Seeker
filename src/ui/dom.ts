type Attrs = Record<string, unknown> & { class?: string; style?: string };
type Child = Node | string | number | null | undefined | false | Child[];

/** Tiny hyperscript helper: h('div.card#id', {onclick}, children...) */
export function h<K extends keyof HTMLElementTagNameMap>(sel: K | string, attrs?: Attrs | Child, ...children: Child[]): HTMLElement {
  if (attrs instanceof Node || typeof attrs !== 'object' || attrs === null || Array.isArray(attrs)) {
    if (attrs !== undefined) children.unshift(attrs as Child);
    attrs = {};
  }
  const [tagAndId, ...classes] = sel.split('.');
  const [tag, id] = tagAndId.split('#');
  const el = document.createElement(tag || 'div');
  if (id) el.id = id;
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs as Attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = [el.className, v].filter(Boolean).join(' ');
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k === 'html') el.innerHTML = String(v);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el: HTMLElement, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

export function clear(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Very small, safe formatter: **bold**, *italic*, line breaks. Escapes HTML first. */
export function rich(text: string): HTMLElement {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return h('div.rich', { html });
}

export function toast(msg: string, kind: 'info' | 'good' | 'bad' = 'info', ms = 2600) {
  let host = document.getElementById('toasts');
  if (!host) document.body.append((host = h('div#toasts')));
  const t = h(`div.toast.${kind}`, msg);
  host.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

/** Modal dialog; resolves with the value of the clicked button. */
export function modal<T extends string>(title: string, body: Node | string, buttons: { label: string; value: T; primary?: boolean }[]): Promise<T> {
  return new Promise((resolve) => {
    const close = (v: T) => {
      back.remove();
      resolve(v);
    };
    const back = h(
      'div.modal-back',
      h(
        'div.modal',
        { role: 'dialog', 'aria-modal': 'true' },
        h('h3', title),
        typeof body === 'string' ? rich(body) : body,
        h('div.modal-actions', buttons.map((b) => h(`button.btn${b.primary ? '.primary' : ''}`, { onclick: () => close(b.value) }, b.label))),
      ),
    );
    document.body.append(back);
  });
}

export function fmtClock(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = ms / 1000;
  if (s < 10) return `0:0${s.toFixed(1)}`.replace(/^0:0(\d\d)/, '0:$1');
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function fmtMinutes(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** replaceChildren that skips null/false entries. */
export function setChildren(el: HTMLElement, ...kids: (Node | string | null | undefined | false)[]) {
  el.replaceChildren(...(kids.filter((k) => k !== null && k !== undefined && k !== false) as (Node | string)[]));
}
