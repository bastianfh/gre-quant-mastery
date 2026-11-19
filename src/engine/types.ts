// Core domain types for GRE Quant Mastery.

export type CategoryId = 'arithmetic' | 'algebra' | 'word' | 'geometry' | 'data' | 'strategy';

/** Question formats used on the GRE. Data interpretation is a flag (`di`) on top of a format. */
export type Format = 'qc' | 'mcq' | 'multi' | 'numeric';

export type Level = 1 | 2 | 3 | 4 | 5;

export const LEVEL_NAMES: Record<Level, string> = {
  1: 'Beginner',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Expert',
};

export const FORMAT_NAMES: Record<Format | 'di', string> = {
  qc: 'Quantitative Comparison',
  mcq: 'Multiple Choice — One Answer',
  multi: 'Multiple Choice — One or More',
  numeric: 'Numeric Entry',
  di: 'Data Interpretation',
};

export const QC_CHOICES = [
  'Quantity A is greater.',
  'Quantity B is greater.',
  'The two quantities are equal.',
  'The relationship cannot be determined from the information given.',
];

// ---------- Diagrams (rendered as SVG from the same data used to compute answers) ----------
export interface Pt { x: number; y: number }
export interface DiagramLabel { at: Pt; text: string; anchor?: 'start' | 'middle' | 'end' }
export interface GeoDiagram {
  kind: 'geo';
  width: number; height: number;          // viewBox units
  segments?: { a: Pt; b: Pt; dashed?: boolean }[];
  polygons?: { pts: Pt[]; shaded?: boolean }[];
  circles?: { c: Pt; r: number }[];
  arcs?: { c: Pt; r: number; from: number; to: number; sector?: boolean }[]; // degrees, counter-clockwise math convention
  points?: { p: Pt; label?: string; dx?: number; dy?: number }[];
  labels?: DiagramLabel[];
  rightAngles?: { at: Pt; dir1: Pt; dir2: Pt }[];
  axes?: { xMin: number; xMax: number; yMin: number; yMax: number }; // when present, coordinates are in axis units
  note?: string; // e.g. "Figure not drawn to scale"
}
export interface ChartSeries { name: string; values: number[] }
export interface ChartDiagram {
  kind: 'bar' | 'line' | 'pie' | 'histogram' | 'scatter' | 'table' | 'boxplot' | 'stackedbar';
  title: string;
  categories?: string[];             // x categories (bar/line/histogram/table rows)
  series?: ChartSeries[];            // bar/line/table columns
  yLabel?: string; xLabel?: string;
  slices?: { label: string; value: number }[]; // pie (value = percent)
  points?: Pt[];                     // scatter
  columns?: string[];                // table header
  rows?: (string | number)[][];      // table
  box?: { label: string; min: number; q1: number; median: number; q3: number; max: number }[];
  unit?: string;
  note?: string;
}
export type Diagram = GeoDiagram | ChartDiagram;

// ---------- Questions ----------
export type NumericAnswer = { kind: 'number'; value: number; tolerance?: number } | { kind: 'fraction'; num: number; den: number };

export interface Question {
  id: string;
  generatorId: string;
  seed: number;
  category: CategoryId;
  unit: string;              // unit / subtopic id (mastery tracked here)
  subtopic: string;          // finer concept label
  format: Format;
  di: boolean;               // data-interpretation item
  level: Level;
  timeSec: number;           // estimated solving time for a prepared student
  stem: string;              // markup: text with $inline math$ and $$display math$$
  qc?: { given?: string; a: string; b: string };
  choices?: string[];        // mcq/multi (markup). QC uses QC_CHOICES.
  answer: number | number[] | NumericAnswer; // index for qc/mcq, indices for multi, NumericAnswer for numeric
  unitLabel?: string;        // numeric entry unit, e.g. "dollars"
  explanation: string[];     // step-by-step
  altMethod?: string;
  trap: string;              // common mistake
  hints: [string, string, string];
  distractorNotes?: Record<number, string>; // why a specific wrong choice is tempting
  skills: string[];
  concepts: string[];
  diagram?: Diagram;
  source: 'bank' | 'variant' | 'ai';
  /** Shared-data set membership (data-interpretation sets). */
  setId?: string;
  setIndex?: number;
  setSize?: number;
}

export type UserAnswer = number | number[] | string | null; // string for numeric entry ("3.5" or "7/8")

// ---------- Generators ----------
export interface GenOutput extends Omit<Question, 'id' | 'generatorId' | 'seed' | 'category' | 'unit' | 'level' | 'timeSec' | 'source' | 'skills' | 'concepts' | 'subtopic' | 'di'> {
  timeSec?: number;
  subtopic?: string;
  skills?: string[];
  concepts?: string[];
  di?: boolean;
  /** For QC/test validation: sample admissible values and return [quantityA, quantityB]. */
  qcSample?: (rand: () => number) => [number, number] | null;
}

export interface Generator {
  id: string;
  unit: string;
  subtopic: string;
  levels: Level[];
  skills: string[];
  concepts: string[];
  /** Boss challenge tag, e.g. 'geometry+ratios'. */
  combo?: string;
  /** Member of a shared-data set (e.g. three questions on one chart): members share the base's seed. */
  setOf?: { base: string; index: number; size: number };
  generate: (rng: import('../lib/rng').RNG, level: Level) => GenOutput;
}

// ---------- Persistence records ----------
export type Mode = 'practice' | 'learn' | 'daily' | 'speed' | 'qc' | 'boss' | 'review' | 'mock' | 'diagnostic' | 'mastery' | 'drill';

export type ErrorType = 'concept' | 'calculation' | 'misread' | 'time' | 'strategy' | 'careless';
export const ERROR_TYPE_NAMES: Record<ErrorType, string> = {
  concept: 'Conceptual misunderstanding',
  calculation: 'Calculation error',
  misread: 'Misread the question',
  time: 'Time pressure',
  strategy: 'Incorrect strategy',
  careless: 'Careless slip',
};

export interface Attempt {
  id?: number;
  qid: string;
  generatorId: string;
  unit: string;
  category: CategoryId;
  format: Format;
  di: boolean;
  level: Level;
  mode: Mode;
  correct: boolean;
  skipped: boolean;
  timeMs: number;
  targetSec: number;
  timeLimitSec?: number;     // speed drills / timed practice
  answer: UserAnswer;
  ts: number;
  hintsUsed: number;
  confidence?: 1 | 2 | 3;
  errorType?: ErrorType;
  autoErrorType?: ErrorType;
  sessionId: string;
  isReview?: boolean;
}

export interface SrsItem {
  qid: string;               // original missed question
  generatorId: string;
  unit: string;
  stage: number;             // 0..5 (5 = graduated)
  due: number;               // timestamp
  lapses: number;
  missCount: number;
  lastErrorType?: ErrorType;
  createdAt: number;
  lastReviewed?: number;
  graduated: boolean;
}

export interface ExamResult {
  id: string;
  kind: 'mock' | 'diagnostic';
  form: string;
  startedAt: number;
  finishedAt: number;
  path: 'easier' | 'medium' | 'harder';
  sections: {
    qids: string[];
    answers: UserAnswer[];
    correct: boolean[];
    timeMs: number[];
    timeUsedSec: number;
    limitSec: number;
    marked: boolean[];
  }[];
  raw: number;
  scaled: number;
  range: [number, number];
}

export interface SessionResult {
  id: string;
  mode: Mode;
  ts: number;
  total: number;
  correct: number;
  score?: number;            // mode-specific score
  meta?: Record<string, unknown>;
}

export interface Profile {
  id: 'me';
  name: string;
  targetScore: number;
  examDate: string;          // yyyy-mm-dd
  startDate: string;         // plan day 1
  dailyMinutes: number;
  dailyQuestionGoal: number;
  xp: number;
  achievements: Record<string, number>; // id -> unlock ts
  lessonsCompleted: Record<string, number>;
  lessonMastery: Record<string, number>; // unit -> best mastery-check %
  bookmarks: string[];       // saved question ids
  flagged: string[];
  formulaBookmarks: string[];
  reports: { qid: string; note: string; ts: number }[];
  officialScores: import('./scoring').OfficialScore[];
  ratings: Record<string, number>; // Elo per unit + '_global'
  diagnosticDone: boolean;
  settings: {
    feedback: 'immediate' | 'delayed';
    showTimer: boolean;
    sound: boolean;
    reduceMotion: boolean;
    confidencePrompt: boolean;
    theme: 'dark' | 'light';
  };
  createdAt: number;
  version: number;
  editedAt?: number;         // last time the user edited settings/goals (sync conflict resolution)
}

export interface DailyLog {
  date: string;              // yyyy-mm-dd
  questions: number;
  correct: number;
  timeMs: number;
  xp: number;
  reviews: number;
  speedDrills: number;
  modes: Record<string, number>;
  planDone: Record<string, boolean>;
  objectivesClaimed: string[];
  dailyChallengeScore?: number;
  estScore?: number;
}
