import Dexie, { type Table } from 'dexie';
import type { Attempt, DailyLog, ExamResult, Profile, Question, SessionResult, SrsItem } from '../engine/types';

export interface KV { key: string; value: unknown; ts: number }

export class GQDB extends Dexie {
  profile!: Table<Profile, string>;
  attempts!: Table<Attempt, number>;
  srs!: Table<SrsItem, string>;
  exams!: Table<ExamResult, string>;
  sessions!: Table<SessionResult, string>;
  daily!: Table<DailyLog, string>;
  kv!: Table<KV, string>;
  aiQuestions!: Table<Question, string>;
  constructor(name = 'gre-quant-mastery') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      attempts: '++id, qid, unit, ts, mode, generatorId',
      srs: 'qid, due, unit',
      exams: 'id, finishedAt',
      sessions: 'id, ts, mode',
      daily: 'date',
      kv: 'key',
      aiQuestions: 'id',
    });
  }
}

export let db = new GQDB();
/** Tests can point the store at an isolated database. */
export function useDatabase(name: string) { db = new GQDB(name); return db; }
