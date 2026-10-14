// Small, dependency-free inline-SVG charts (theme-aware via CSS custom properties in styles/charts.css).
// Thin marks, hairline grid, one axis, selective direct labels, a hover/focus tooltip on every chart.
import { h } from './dom';
import '../styles/viz.css';

const NS = 'http://www.w3.org/2000/svg';

function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, ...kids: (SVGElement | string)[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const k of kids) el.append(k);
  return el;
}

/** A tooltip host: wrap a chart; call show(x, y, rows) in chart-local px. Values lead, labels follow. */
function withTooltip(chart: Element): { el: HTMLElement; show: (x: number, y: number, title: string, rows: { color?: string; value: string; label: string }[]) => void; hide: () => void } {
  const tip = h('div.viz-tip', { role: 'status' });
  tip.hidden = true;
  const el = h('div.viz-wrap', chart as unknown as Node, tip);
  return {
    el,
    show(x, y, title, rows) {
      const head = h('div.viz-tip-title');
      head.textContent = title;
      tip.replaceChildren(
        head,
        ...rows.map((r) => {
          const v = h('strong');
          v.textContent = r.value;
          const l = h('span');
          l.textContent = r.label;
          return h('div.viz-tip-row', r.color ? h('i.viz-key', { style: `background:${r.color}` }) : null, v, l);
        }),
      );
      tip.hidden = false;
      const w = el.clientWidth;
      const tw = tip.offsetWidth;
      tip.style.left = `${Math.max(0, Math.min(w - tw, x - tw / 2))}px`;
      tip.style.top = `${Math.max(0, y - tip.offsetHeight - 10)}px`;
    },
    hide() {
      tip.hidden = true;
    },
  };
}

// ------------------------------------------------------------------ donut
export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** Part-to-whole donut (≤ 6 slices) with the headline in the hole and a legend with counts. */
export function donut(slices: Slice[], center: { value: string; label: string }): HTMLElement {
  const total = slices.reduce((a, x) => a + x.value, 0) || 1;
  const R = 42, W = 12, C = 2 * Math.PI * R;
  const svg = s('svg', { viewBox: '0 0 100 100', class: 'viz-donut', role: 'img', 'aria-label': slices.map((x) => `${x.label} ${x.value}`).join(', ') });
  svg.append(s('circle', { cx: 50, cy: 50, r: R, fill: 'none', stroke: 'var(--viz-track)', 'stroke-width': W }));
  let off = 0;
  const gap = slices.filter((x) => x.value > 0).length > 1 ? 1.2 : 0; // 2px-ish surface gap between segments
  const tt = withTooltip(svg);
  for (const x of slices) {
    if (!x.value) continue;
    const len = (x.value / total) * C;
    const seg = s('circle', {
      cx: 50, cy: 50, r: R, fill: 'none', stroke: x.color, 'stroke-width': W,
      'stroke-dasharray': `${Math.max(0.01, len - gap)} ${C}`, 'stroke-dashoffset': -off, transform: 'rotate(-90 50 50)',
      class: 'viz-seg', tabindex: 0,
    });
    const show = () => {
      const r = tt.el.getBoundingClientRect();
      tt.show(r.width / 2, r.height * 0.25, x.label, [{ color: x.color, value: `${x.value}`, label: `${Math.round((100 * x.value) / total)}%` }]);
    };
    seg.addEventListener('pointerenter', show);
    seg.addEventListener('focus', show);
    seg.addEventListener('pointerleave', tt.hide);
    seg.addEventListener('blur', tt.hide);
    svg.append(seg);
    off += len;
  }
  svg.append(s('text', { x: 50, y: 50, 'text-anchor': 'middle', class: 'viz-donut-value' }, center.value));
  svg.append(s('text', { x: 50, y: 63, 'text-anchor': 'middle', class: 'viz-donut-label' }, center.label));
  const legend = h(
    'div.viz-legend.col',
    slices.map((x) => h('div.viz-legend-item', h('i.viz-key.box', { style: `background:${x.color}` }), h('span', x.label), h('strong', String(x.value)), h('span.muted', `${Math.round((100 * x.value) / total)}%`))),
  );
  return h('div.viz-donut-row', tt.el, legend);
}

// ------------------------------------------------------------------ line
export interface LinePoint {
  x: number; // e.g. date or index
  y: number;
  label: string; // tooltip title
}

/** Single-series line with a soft area wash, end label, and a crosshair tooltip that snaps to the nearest point. */
export function lineChart(points: LinePoint[], o: { yMin?: number; yMax?: number; unit?: string; name: string; height?: number; color?: string; ticks?: number[] }): HTMLElement {
  const W = 320, H = o.height ?? 150, L = 30, R = 34, T = 10, B = 18;
  const ys = points.map((p) => p.y);
  let lo = o.yMin ?? Math.min(...ys), hi = o.yMax ?? Math.max(...ys);
  if (hi - lo < 1) (lo -= 5), (hi += 5);
  const xs = points.map((_, i) => i);
  const px = (i: number) => L + (points.length === 1 ? (W - L - R) / 2 : (i / (xs.length - 1)) * (W - L - R));
  const py = (y: number) => T + (1 - (y - lo) / (hi - lo)) * (H - T - B);
  const color = o.color ?? 'var(--viz-1)';
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz-line', role: 'img', 'aria-label': `${o.name}: ${points.map((p) => `${p.label} ${p.y}${o.unit ?? ''}`).join('; ')}` });
  const ticks = o.ticks ?? niceTicks(lo, hi, 3);
  for (const t of ticks) {
    if (t < lo || t > hi) continue;
    svg.append(s('line', { x1: L, x2: W - R, y1: py(t), y2: py(t), class: 'viz-grid' }));
    svg.append(s('text', { x: L - 6, y: py(t) + 3.5, 'text-anchor': 'end', class: 'viz-tick' }, String(t)));
  }
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ');
  if (points.length > 1) {
    svg.append(s('path', { d: `${d} L${px(points.length - 1)} ${H - B} L${px(0)} ${H - B}Z`, fill: color, class: 'viz-area' }));
    svg.append(s('path', { d, stroke: color, class: 'viz-path' }));
  }
  const last = points[points.length - 1];
  if (last) {
    svg.append(s('circle', { cx: px(points.length - 1), cy: py(last.y), r: 4, fill: color, class: 'viz-dot' }));
    svg.append(s('text', { x: px(points.length - 1) + 8, y: py(last.y) + 4, class: 'viz-endlabel' }, `${Math.round(last.y)}${o.unit ?? ''}`));
  }
  // x labels: first + last
  if (points.length > 1) {
    svg.append(s('text', { x: px(0), y: H - 4, class: 'viz-tick', 'text-anchor': 'start' }, points[0].label));
    svg.append(s('text', { x: px(points.length - 1), y: H - 4, class: 'viz-tick', 'text-anchor': 'end' }, last.label));
  }
  const cross = s('line', { y1: T, y2: H - B, class: 'viz-cross', visibility: 'hidden' });
  const hover = s('circle', { r: 4.5, fill: color, class: 'viz-dot', visibility: 'hidden' });
  svg.append(cross, hover);
  const hit = s('rect', { x: L, y: 0, width: W - L - R, height: H, fill: 'transparent', tabindex: 0, class: 'viz-hit' });
  svg.append(hit);
  const tt = withTooltip(svg);
  let focusIdx = points.length - 1;
  const showAt = (i: number) => {
    const p = points[i];
    cross.setAttribute('x1', String(px(i)));
    cross.setAttribute('x2', String(px(i)));
    cross.setAttribute('visibility', 'visible');
    hover.setAttribute('cx', String(px(i)));
    hover.setAttribute('cy', String(py(p.y)));
    hover.setAttribute('visibility', 'visible');
    const scale = svg.getBoundingClientRect().width / W;
    tt.show(px(i) * scale, py(p.y) * scale, p.label, [{ color, value: `${p.y}${o.unit ?? ''}`, label: o.name }]);
  };
  const hide = () => {
    cross.setAttribute('visibility', 'hidden');
    hover.setAttribute('visibility', 'hidden');
    tt.hide();
  };
  hit.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(px(i) - x) < Math.abs(px(best) - x)) best = i;
    focusIdx = best;
    showAt(best);
  });
  hit.addEventListener('pointerleave', hide);
  hit.addEventListener('focus', () => showAt(focusIdx));
  hit.addEventListener('blur', hide);
  hit.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') focusIdx = Math.max(0, focusIdx - 1);
    else if (e.key === 'ArrowRight') focusIdx = Math.min(points.length - 1, focusIdx + 1);
    else return;
    e.preventDefault();
    showAt(focusIdx);
  });
  return tt.el;
}

export function niceTicks(lo: number, hi: number, n: number): number[] {
  const step0 = (hi - lo) / n;
  const mag = 10 ** Math.floor(Math.log10(step0 || 1));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((x) => x >= step0) ?? 10 * mag;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(Math.round(t));
  return out;
}

// ------------------------------------------------------------------ horizontal bars
export interface BarRow {
  label: string;
  value: number;
  /** text at the bar tip (defaults to value) */
  text?: string;
  sub?: string;
  href?: string;
}

/** Horizontal bars, one series, value at the tip. Rows are HTML so long labels wrap nicely. */
export function barList(rows: BarRow[], o: { max?: number; color?: string; name: string }): HTMLElement {
  const max = o.max ?? Math.max(1, ...rows.map((r) => r.value));
  return h(
    'div.viz-bars',
    { role: 'list', 'aria-label': o.name },
    rows.map((r) =>
      h(
        r.href ? 'a.viz-bar-row' : 'div.viz-bar-row',
        { role: 'listitem', href: r.href ? `#${r.href}` : undefined, title: `${r.label}: ${r.text ?? r.value}` },
        h('div.viz-bar-label', h('span', r.label), r.sub ? h('small', r.sub) : null),
        h(
          'div.viz-bar-track',
          h('span.viz-bar', { style: `width:${Math.max(1.5, (100 * r.value) / max)}%;background:${o.color ?? 'var(--viz-1)'}` }),
          h('span.viz-bar-val', r.text ?? String(r.value)),
        ),
      ),
    ),
  );
}

// ------------------------------------------------------------------ stacked bar (one row)
export interface StackPart {
  label: string;
  value: number;
  color: string;
}

/** A single 100% stacked bar (e.g. win/draw/loss) with 2px surface gaps; labels only where they fit. */
export function stackBar(parts: StackPart[], o: { title: string }): HTMLElement {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const el = h('div.viz-stack', { role: 'img', 'aria-label': `${o.title}: ${parts.map((p) => `${p.label} ${p.value}`).join(', ')}` });
  const tt = withTooltip(el);
  for (const p of parts) {
    if (!p.value) continue;
    const pct = (100 * p.value) / total;
    const seg = h('span.viz-stack-seg', { style: `flex-basis:${pct}%;background:${p.color}`, tabindex: 0 }, pct >= 18 ? String(p.value) : '');
    const show = () => tt.show(seg.offsetLeft + seg.offsetWidth / 2, 0, o.title, [{ color: p.color, value: String(p.value), label: `${p.label} · ${Math.round(pct)}%` }]);
    seg.addEventListener('pointerenter', show);
    seg.addEventListener('focus', show);
    seg.addEventListener('pointerleave', tt.hide);
    seg.addEventListener('blur', tt.hide);
    el.append(seg);
  }
  return tt.el;
}

// ------------------------------------------------------------------ columns
export interface Column {
  label: string;
  value: number;
  title?: string;
}

/** Vertical columns (one series), 4px rounded data end, square at the baseline, hover tooltip per column. */
export function columns(cols: Column[], o: { name: string; color?: string; height?: number; unit?: string; max?: number }): HTMLElement {
  const W = 320, H = o.height ?? 120, L = 26, B = 18, T = 14;
  const max = o.max ?? Math.max(1, ...cols.map((c) => c.value));
  const ticks = niceTicks(0, max, 2);
  const top = Math.max(max, ticks[ticks.length - 1] ?? max);
  const band = (W - L) / Math.max(1, cols.length);
  const bw = Math.min(24, band * 0.6);
  const py = (v: number) => T + (1 - v / top) * (H - T - B);
  const color = o.color ?? 'var(--viz-1)';
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz-cols', role: 'img', 'aria-label': `${o.name}: ${cols.map((c) => `${c.title ?? c.label} ${c.value}`).join('; ')}` });
  for (const t of ticks) {
    svg.append(s('line', { x1: L, x2: W, y1: py(t), y2: py(t), class: t === 0 ? 'viz-base' : 'viz-grid' }));
    svg.append(s('text', { x: L - 6, y: py(t) + 3.5, 'text-anchor': 'end', class: 'viz-tick' }, String(t)));
  }
  const tt = withTooltip(svg);
  cols.forEach((c, i) => {
    const x = L + band * i + (band - bw) / 2;
    const y = py(c.value);
    const hgt = H - B - y;
    const r = Math.min(4, hgt / 2, bw / 2);
    const d = hgt <= 0 ? '' : `M${x} ${H - B}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${H - B}Z`;
    if (d) svg.append(s('path', { d, fill: color, class: 'viz-col' }));
    const hit = s('rect', { x: L + band * i, y: T, width: band, height: H - T - B, fill: 'transparent', tabindex: 0, class: 'viz-hit' });
    const show = () => {
      const scale = svg.getBoundingClientRect().width / W;
      tt.show((x + bw / 2) * scale, y * scale, c.title ?? c.label, [{ color, value: `${c.value}${o.unit ?? ''}`, label: o.name }]);
    };
    hit.addEventListener('pointerenter', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('pointerleave', tt.hide);
    hit.addEventListener('blur', tt.hide);
    svg.append(hit);
    if (cols.length <= 8 || i === 0 || i === cols.length - 1) svg.append(s('text', { x: x + bw / 2, y: H - 4, 'text-anchor': 'middle', class: 'viz-tick' }, c.label));
  });
  return tt.el;
}

// ------------------------------------------------------------------ ring (progress)
/** Circular progress ring with a value in the middle (e.g. daily goal). */
export function ring(p: number, o: { value: string; label?: string; color?: string; size?: number }): SVGSVGElement {
  const R = 20, C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(1, p));
  const svg = s('svg', { viewBox: '0 0 48 48', class: 'ring-svg', role: 'img', 'aria-label': `${o.value}${o.label ? ' ' + o.label : ''}` });
  svg.append(s('circle', { cx: 24, cy: 24, r: R, fill: 'none', stroke: 'var(--viz-track)', 'stroke-width': 5 }));
  svg.append(
    s('circle', {
      cx: 24, cy: 24, r: R, fill: 'none', stroke: o.color ?? 'var(--accent)', 'stroke-width': 5, 'stroke-linecap': 'round',
      'stroke-dasharray': `${pct * C} ${C}`, transform: 'rotate(-90 24 24)', class: 'ring-fill',
    }),
  );
  svg.append(s('text', { x: 24, y: 28.5, 'text-anchor': 'middle', class: 'ring-text' }, o.value));
  return svg;
}
