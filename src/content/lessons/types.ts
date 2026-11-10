export interface Lesson {
  unit: string;
  intro: string;
  concepts: { title: string; body: string }[];
  formulas: { label: string; tex: string }[];
  rules: string[];
  examples: { problem: string; steps: string[]; answer: string }[];
  mistakes: string[];
  strategies: string[];
}
