import type { Lesson, TrackInfo } from './types';
import { FOUNDATIONS } from './foundations';
import { TACTICS } from './tactics';
import { ENDGAMES } from './endgames';
import { LONGGAME } from './longgame';

export const TRACKS: TrackInfo[] = [
  { id: 'foundations', title: 'Foundational Principles', blurb: 'Piece values, the centre, development, king safety and your first plans.', icon: '♙' },
  { id: 'tactics', title: 'Tactical Patterns', blurb: 'Forks, pins, skewers, discoveries and the mating patterns that win games.', icon: '⚔' },
  { id: 'endgames', title: 'Endgame Technique', blurb: 'Basic mates, opposition, pawn races and the rook endings every player needs.', icon: '♔' },
  { id: 'longgame', title: 'Long Games & Study Method', blurb: 'The 20/40/40 rule, a thinking routine, time management and learning from your games.', icon: '⏳' },
];

export const ALL_LESSONS: Lesson[] = [...LONGGAME.slice(0, 1), ...FOUNDATIONS, ...TACTICS, ...ENDGAMES, ...LONGGAME.slice(1)];

export function lessonsForTrack(track: string): Lesson[] {
  return ALL_LESSONS.filter((l) => l.track === track);
}

export function lessonById(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}
