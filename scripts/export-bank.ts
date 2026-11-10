// Export the fixed question bank as JSON and print a readable random sample for manual review.
// Usage: npm run bank:export -- [outFile] [sampleSize] [seed]
import fs from 'node:fs';
import { getBank } from '../src/engine/bank';
import { answerText } from '../src/engine/grading';
import { plainText } from '../src/lib/markup';
import { RNG } from '../src/lib/rng';
import { QC_CHOICES } from '../src/engine/types';

const [out = 'question-bank.json', n = '0', seed = '7'] = process.argv.slice(2);
const bank = getBank();
fs.writeFileSync(out, JSON.stringify(bank, null, 1));
console.log(`Wrote ${bank.length} questions to ${out}`);
const sample = new RNG(Number(seed)).sample(bank, Number(n));
for (const q of sample) {
  console.log(`\n=== ${q.id}  [${q.format}${q.di ? '/DI' : ''}, L${q.level}]`);
  if (q.qc) console.log(`${q.qc.given ? 'Given: ' + plainText(q.qc.given) + '\n' : ''}A: ${plainText(q.qc.a)}\nB: ${plainText(q.qc.b)}`);
  if (q.stem) console.log(plainText(q.stem));
  if (q.diagram && q.diagram.kind !== 'geo') console.log('DATA:', JSON.stringify(q.diagram).slice(0, 400));
  (q.format === 'qc' ? QC_CHOICES : q.choices ?? []).forEach((c, i) => console.log(`  (${'ABCDEFGH'[i]}) ${plainText(c)}`));
  console.log(`ANSWER: ${plainText(answerText(q))}`);
  console.log(`WHY: ${q.explanation.map(plainText).join(' | ')}`);
}
