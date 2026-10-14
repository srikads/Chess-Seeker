import { stubView } from './stub';
import type { View } from '../router';

export function openingsView(): View {
  return stubView('Openings', 'Coming soon.');
}
