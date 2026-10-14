// Placeholder for a view that is still being built.
import { h } from '../ui/dom';
import { mascot } from '../ui/coach';
import { pageHeader } from '../ui/widgets';
import type { View } from '../router';

export function stubView(title: string, sub: string): View {
  return { el: h('div', pageHeader(title, { back: '/more' }), h('div.card.row', mascot('thinking'), h('p', sub))), title };
}
