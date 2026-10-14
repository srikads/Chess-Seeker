import { stubView } from './stub';
import type { View } from '../router';

export function visionView(): View {
  return stubView('Board vision', 'Coming soon.');
}
