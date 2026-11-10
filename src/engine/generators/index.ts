import type { Generator } from '../types';
import { ARITHMETIC } from './arithmetic';
import { ALGEBRA } from './algebra';
import { WORD } from './word';
import { GEOMETRY } from './geometry';
import { DATA } from './data';
import { STRATEGY } from './strategy';

export const ALL_GENERATORS: Generator[] = [...ARITHMETIC, ...ALGEBRA, ...WORD, ...GEOMETRY, ...DATA, ...STRATEGY];
