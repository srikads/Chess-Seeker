import { stubView } from './stub';
import type { View } from '../router';

export function analysisView(_params: string[]): View {
  return stubView('Analysis board', 'Coming soon.');
}
