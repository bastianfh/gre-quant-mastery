import type { Lesson } from './types';
import { ARITHMETIC_LESSONS } from './arithmetic';
import { ALGEBRA_LESSONS } from './algebra';
import { WORD_LESSONS } from './word';
import { GEOMETRY_LESSONS } from './geometry';
import { DATA_LESSONS } from './data';
import { STRATEGY_LESSONS } from './strategy';

export type { Lesson };
export const ALL_LESSONS: Lesson[] = [...ARITHMETIC_LESSONS, ...ALGEBRA_LESSONS, ...WORD_LESSONS, ...GEOMETRY_LESSONS, ...DATA_LESSONS, ...STRATEGY_LESSONS];
export const LESSONS: Record<string, Lesson> = Object.fromEntries(ALL_LESSONS.map((l) => [l.unit, l]));
