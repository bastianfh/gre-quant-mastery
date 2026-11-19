import type { Generator } from '../types';
import { ARITHMETIC } from './arithmetic';
import { ALGEBRA } from './algebra';
import { WORD } from './word';
import { GEOMETRY } from './geometry';
import { DATA } from './data';
import { STRATEGY } from './strategy';
import { DI_SETS } from './disets';
import { EXPERT } from './expert';

export const ALL_GENERATORS: Generator[] = [...ARITHMETIC, ...ALGEBRA, ...WORD, ...GEOMETRY, ...DATA, ...STRATEGY, ...DI_SETS, ...EXPERT];
