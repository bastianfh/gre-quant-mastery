import type { CategoryId } from '../engine/types';

export interface Category { id: CategoryId; name: string; short: string; color: string; examWeight: number }
export interface Unit { id: string; category: CategoryId; name: string; concepts: string[]; week: 1 | 2 | 3 }

export const CATEGORIES: Category[] = [
  { id: 'arithmetic', name: 'Arithmetic', short: 'ARI', color: '#4ea8ff', examWeight: 0.27 },
  { id: 'algebra', name: 'Algebra', short: 'ALG', color: '#37d6a5', examWeight: 0.24 },
  { id: 'word', name: 'Word Problems', short: 'WRD', color: '#f2b84b', examWeight: 0.14 },
  { id: 'geometry', name: 'Geometry', short: 'GEO', color: '#b48cff', examWeight: 0.15 },
  { id: 'data', name: 'Data Analysis', short: 'DAT', color: '#ff7a8a', examWeight: 0.2 },
  { id: 'strategy', name: 'Advanced Strategy', short: 'STR', color: '#9aa7b8', examWeight: 0 },
];
export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export const UNITS: Unit[] = [
  // ---------------- A. Arithmetic ----------------
  { id: 'ar.integers', category: 'arithmetic', week: 1, name: 'Integers & Number Properties', concepts: ['Integers', 'Positive and negative numbers', 'Odd and even numbers', 'Properties of integers', 'Number properties', 'Order of operations'] },
  { id: 'ar.primes', category: 'arithmetic', week: 1, name: 'Primes & Prime Factorization', concepts: ['Prime numbers', 'Prime factorization', 'Counting divisors'] },
  { id: 'ar.factors', category: 'arithmetic', week: 1, name: 'Factors, Multiples, GCD & LCM', concepts: ['Factors and multiples', 'Greatest common divisor', 'Least common multiple', 'Divisibility rules'] },
  { id: 'ar.remainders', category: 'arithmetic', week: 1, name: 'Remainders & Cyclicity', concepts: ['Remainders', 'Units-digit cycles', 'Modular reasoning'] },
  { id: 'ar.absolute', category: 'arithmetic', week: 1, name: 'Absolute Value', concepts: ['Absolute value', 'Distance on the number line'] },
  { id: 'ar.fractions', category: 'arithmetic', week: 1, name: 'Fractions & Decimals', concepts: ['Fractions', 'Fraction operations', 'Decimals', 'Comparing fractions'] },
  { id: 'ar.percents', category: 'arithmetic', week: 1, name: 'Percentages', concepts: ['Percentages', 'Percentage increase and decrease', 'Successive percentage changes', 'Percent of percent'] },
  { id: 'ar.ratios', category: 'arithmetic', week: 1, name: 'Ratios & Proportions', concepts: ['Ratios', 'Proportions', 'Part-to-part vs part-to-whole', 'Combining ratios'] },
  { id: 'ar.rates', category: 'arithmetic', week: 1, name: 'Rates & Unit Conversions', concepts: ['Rates', 'Unit conversions', 'Unit rates'] },
  { id: 'ar.exponents', category: 'arithmetic', week: 1, name: 'Powers, Exponents & Roots', concepts: ['Powers and exponents', 'Square roots', 'Order of operations', 'Comparing powers'] },
  { id: 'ar.sequences', category: 'arithmetic', week: 1, name: 'Sequences & Consecutive Integers', concepts: ['Number sequences', 'Arithmetic sequences', 'Geometric sequences', 'Consecutive integers', 'Recursive sequences'] },
  { id: 'ar.estimation', category: 'arithmetic', week: 1, name: 'Estimation & Approximation', concepts: ['Estimation and approximation', 'Benchmark fractions', 'Rounding'] },
  // ---------------- B. Algebra ----------------
  { id: 'al.expressions', category: 'algebra', week: 1, name: 'Expressions & Manipulation', concepts: ['Algebraic expressions', 'Simplification', 'Substitution', 'Algebraic manipulation'] },
  { id: 'al.linear', category: 'algebra', week: 1, name: 'Linear Equations', concepts: ['Linear equations', 'Solving for a variable', 'Literal equations'] },
  { id: 'al.inequalities', category: 'algebra', week: 1, name: 'Inequalities & Absolute Value Equations', concepts: ['Linear inequalities', 'Absolute value equations and inequalities', 'Compound inequalities'] },
  { id: 'al.systems', category: 'algebra', week: 1, name: 'Systems of Equations', concepts: ['Systems of equations', 'Simultaneous equations', 'Elimination and substitution', 'Combination shortcuts'] },
  { id: 'al.quadratics', category: 'algebra', week: 1, name: 'Quadratics, Factoring & Polynomials', concepts: ['Quadratic equations', 'Factoring', 'Polynomials', 'Special products', 'Sum and product of roots'] },
  { id: 'al.exponents', category: 'algebra', week: 1, name: 'Exponent Rules & Radicals', concepts: ['Exponents', 'Radicals', 'Exponential equations', 'Rationalizing'] },
  { id: 'al.rational', category: 'algebra', week: 1, name: 'Rational Expressions', concepts: ['Rational expressions', 'Algebraic fractions', 'Restrictions on variables'] },
  { id: 'al.functions', category: 'algebra', week: 2, name: 'Functions & Custom Operations', concepts: ['Functions', 'Function notation', 'Composite functions', 'Symbolic operators'] },
  { id: 'al.coordinate', category: 'algebra', week: 2, name: 'Lines in the Coordinate Plane', concepts: ['Coordinate plane', 'Slope', 'Linear equations in graph form', 'Intercepts', 'Parallel and perpendicular slopes'] },
  // ---------------- C. Word Problems ----------------
  { id: 'wp.translation', category: 'word', week: 2, name: 'Translation, Age & Multi-step Problems', concepts: ['Translating written information into mathematical expressions', 'Age problems', 'Multi-step equations', 'Ratio applications', 'Consecutive integer problems'] },
  { id: 'wp.work', category: 'word', week: 2, name: 'Work-Rate Problems', concepts: ['Work-rate problems', 'Combined rates', 'Pipes and drains'] },
  { id: 'wp.distance', category: 'word', week: 2, name: 'Distance, Rate & Time', concepts: ['Distance, rate, and time', 'Average speed', 'Relative speed'] },
  { id: 'wp.mixtures', category: 'word', week: 2, name: 'Mixtures & Weighted Averages', concepts: ['Mixture problems', 'Weighted averages', 'Alligation'] },
  { id: 'wp.money', category: 'word', week: 2, name: 'Profit, Loss & Percent Applications', concepts: ['Profit and loss', 'Percentage applications', 'Markup and discount', 'Tax and commission'] },
  { id: 'wp.interest', category: 'word', week: 2, name: 'Simple & Compound Interest', concepts: ['Simple interest', 'Compound interest', 'Growth and decay'] },
  // ---------------- D. Geometry ----------------
  { id: 'ge.lines', category: 'geometry', week: 2, name: 'Lines & Angles', concepts: ['Lines and angles', 'Parallel and perpendicular lines', 'Vertical and supplementary angles', 'Transversals'] },
  { id: 'ge.triangles', category: 'geometry', week: 2, name: 'Triangles', concepts: ['Triangles', 'Triangle inequalities', 'Similar triangles', 'Congruent triangles', 'Isosceles and equilateral triangles', 'Area of triangles'] },
  { id: 'ge.right', category: 'geometry', week: 2, name: 'Right Triangles', concepts: ['Pythagorean theorem', 'Pythagorean triples', 'Special right triangles (30-60-90, 45-45-90)'] },
  { id: 'ge.quads', category: 'geometry', week: 2, name: 'Quadrilaterals & Polygons', concepts: ['Quadrilaterals', 'Squares', 'Rectangles', 'Parallelograms', 'Rhombuses', 'Trapezoids', 'Polygons', 'Interior and exterior angles', 'Perimeter', 'Area'] },
  { id: 'ge.circles', category: 'geometry', week: 2, name: 'Circles', concepts: ['Circles', 'Circumference', 'Area', 'Arc length', 'Sector area', 'Inscribed figures'] },
  { id: 'ge.solids', category: 'geometry', week: 2, name: '3-D Geometry', concepts: ['Volume', 'Surface area', 'Three-dimensional geometry', 'Cubes, prisms, cylinders', 'Space diagonals'] },
  { id: 'ge.coordinate', category: 'geometry', week: 2, name: 'Coordinate Geometry', concepts: ['Coordinate geometry', 'Distance formula', 'Midpoint formula', 'Areas on the coordinate plane', 'Geometric relationships'] },
  // ---------------- E. Data Analysis ----------------
  { id: 'da.stats', category: 'data', week: 2, name: 'Mean, Median, Mode & Range', concepts: ['Mean', 'Median', 'Mode', 'Range', 'Weighted averages', 'Effect of changes on statistics'] },
  { id: 'da.spread', category: 'data', week: 2, name: 'Spread, Percentiles & Distributions', concepts: ['Standard deviation', 'Percentiles', 'Quartiles', 'Interquartile range', 'Boxplots', 'Frequency distributions', 'Normal distribution', 'Statistical comparisons'] },
  { id: 'da.counting', category: 'data', week: 2, name: 'Counting, Permutations & Combinations', concepts: ['Counting principles', 'Permutations', 'Combinations', 'Restrictions and complements'] },
  { id: 'da.probability', category: 'data', week: 2, name: 'Probability', concepts: ['Probability', 'Independent events', 'Dependent events', 'Conditional probability', 'Complement rule'] },
  { id: 'da.sets', category: 'data', week: 2, name: 'Sets & Overlapping Groups', concepts: ['Sets', 'Venn diagrams', 'Overlapping groups', 'Inclusion–exclusion', 'Double-matrix method'] },
  { id: 'da.interpretation', category: 'data', week: 2, name: 'Data Interpretation', concepts: ['Data tables', 'Bar graphs', 'Line graphs', 'Pie charts', 'Histograms', 'Scatterplots', 'Data interpretation', 'Percent change from charts'] },
  // ---------------- F. Strategy ----------------
  { id: 'st.qc', category: 'strategy', week: 3, name: 'Quantitative Comparison Mastery', concepts: ['Testing positive and negative values', 'Testing zero', 'Testing fractions', 'Testing boundary cases', 'Identifying hidden constraints', 'Simplifying both quantities'] },
  { id: 'st.plugin', category: 'strategy', week: 3, name: 'Backsolving, Plugging In & Smart Numbers', concepts: ['Backsolving', 'Plugging in numbers', 'Choosing convenient numbers', 'Working backward', 'Using the answer choices strategically'] },
  { id: 'st.traps', category: 'strategy', week: 3, name: 'Traps, Patterns & Efficient Reasoning', concepts: ['Recognizing traps', 'Recognizing patterns', 'Using symmetry', 'Avoiding unnecessary calculations', 'Eliminating answer choices', 'Estimation'] },
];

export const UNIT_BY_ID: Record<string, Unit> = Object.fromEntries(UNITS.map((u) => [u.id, u]));
export const unitsOf = (c: CategoryId) => UNITS.filter((u) => u.category === c);
export const MAIN_CATEGORIES: CategoryId[] = ['arithmetic', 'algebra', 'word', 'geometry', 'data'];
