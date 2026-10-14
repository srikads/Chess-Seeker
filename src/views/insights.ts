import { stubView } from './stub';
import type { View } from '../router';

export function insightsView(): View {
  return stubView('Insights', 'Coming soon.');
}
