/**
 * Cold Eyes Review - Standing-Katz Implementation
 *
 * Systematic review of the Standing-Katz implementation for bugs and improvements
 */

import { STANDING_KATZ_DATA } from './engine/StandingKatzData';
import { calculateZFactorStandingKatz } from './engine/StandingKatzInterpolation';
import { GasProperties } from './engine/GasProperties';

console.log('=== COLD EYES REVIEW: STANDING-KATZ IMPLEMENTATION ===\n');

const issues: string[] = [];
const warnings: string[] = [];
const improvements: string[] = [];

// ============================================
// 1. DATA TABLE VALIDATION
// ============================================
console.log('1. DATA TABLE VALIDATION');
console.log('------------------------');

// Check array dimensions
const numTr = STANDING_KATZ_DATA.Tr_values.length;
const numPr = STANDING_KATZ_DATA.Pr_values.length;
const numDataRows = STANDING_KATZ_DATA.Z_data.length;

console.log(`Tr values: ${numTr}`);
console.log(`Pr values: ${numPr}`);
console.log(`Data rows: ${numDataRows}`);

if (numDataRows !== numTr) {
  issues.push(`CRITICAL: Data table rows (${numDataRows}) != Tr values (${numTr})`);
} else {
  console.log('✅ Data table rows match Tr values');
}

// Check each row has correct number of columns
let columnIssues = 0;
for (let i = 0; i < STANDING_KATZ_DATA.Z_data.length; i++) {
  if (STANDING_KATZ_DATA.Z_data[i].length !== numPr) {
    issues.push(`CRITICAL: Row ${i} has ${STANDING_KATZ_DATA.Z_data[i].length} values, expected ${numPr}`);
    columnIssues++;
  }
}

if (columnIssues === 0) {
  console.log(`✅ All ${numDataRows} rows have ${numPr} columns`);
} else {
  console.log(`❌ ${columnIssues} rows have incorrect column count`);
}

// Check for NaN or invalid values
let invalidValues = 0;
for (let i = 0; i < STANDING_KATZ_DATA.Z_data.length; i++) {
  for (let j = 0; j < STANDING_KATZ_DATA.Z_data[i].length; j++) {
    const Z = STANDING_KATZ_DATA.Z_data[i][j];
    if (!isFinite(Z) || Z <= 0 || Z > 3.0) {
      issues.push(`CRITICAL: Invalid Z at Tr[${i}]=${STANDING_KATZ_DATA.Tr_values[i]}, Pr[${j}]=${STANDING_KATZ_DATA.Pr_values[j]}: ${Z}`);
      invalidValues++;
    }
  }
}

if (invalidValues === 0) {
  console.log(`✅ All ${numDataRows * numPr} data points are valid`);
} else {
  console.log(`❌ ${invalidValues} invalid data points found`);
}

// Check Tr and Pr arrays are sorted
const TrSorted = STANDING_KATZ_DATA.Tr_values.every((val, i, arr) => i === 0 || val > arr[i - 1]);
const PrSorted = STANDING_KATZ_DATA.Pr_values.every((val, i, arr) => i === 0 || val > arr[i - 1]);

if (TrSorted) {
  console.log('✅ Tr values are sorted ascending');
} else {
  issues.push('CRITICAL: Tr values are not sorted');
}

if (PrSorted) {
  console.log('✅ Pr values are sorted ascending');
} else {
  issues.push('CRITICAL: Pr values are not sorted');
}

// ============================================
// 2. PHYSICAL VALIDITY CHECKS
// ============================================
console.log('\n2. PHYSICAL VALIDITY CHECKS');
console.log('---------------------------');

// Z should approach 1.0 as Pr -> 0
const Z_lowPr = STANDING_KATZ_DATA.Z_data[18][0]; // Tr=2.0, Pr=0.2
console.log(`Z at Tr=2.0, Pr=0.2: ${Z_lowPr.toFixed(4)} (should be ~0.999)`);
if (Math.abs(Z_lowPr - 1.0) < 0.01) {
  console.log('✅ Low pressure behavior correct');
} else {
  warnings.push(`Z at low Pr deviates from ideal: ${Z_lowPr}`);
}

// Check critical point region (Tr=1.0, moderate Pr)
const Z_critical = STANDING_KATZ_DATA.Z_data[6][9]; // Tr=1.0, Pr=2.0
console.log(`Z at critical region (Tr=1.0, Pr=2.0): ${Z_critical.toFixed(4)}`);
if (Z_critical >= 0.7 && Z_critical <= 0.9) {
  console.log('✅ Critical region Z-factor reasonable');
} else {
  warnings.push(`Critical region Z seems off: ${Z_critical}`);
}

// Check subcritical behavior (Z should decrease with Pr initially)
const Z_sub1 = STANDING_KATZ_DATA.Z_data[3][9];  // Tr=0.85, Pr=2.0
const Z_sub2 = STANDING_KATZ_DATA.Z_data[3][10]; // Tr=0.85, Pr=2.5
console.log(`Subcritical: Z(Tr=0.85, Pr=2.0)=${Z_sub1.toFixed(3)}, Z(Tr=0.85, Pr=2.5)=${Z_sub2.toFixed(3)}`);
if (Z_sub2 < Z_sub1) {
  console.log('✅ Subcritical Z decreases with Pr (expected)');
} else {
  warnings.push('Subcritical Z behavior unexpected');
}

// ============================================
// 3. INTERPOLATION EDGE CASES
// ============================================
console.log('\n3. INTERPOLATION EDGE CASES');
console.log('---------------------------');

// Test at exact grid points (should return exact value)
const tests = [
  { Pr: 2.0, Tr: 1.0, expected: Z_critical },
  { Pr: 0.2, Tr: 2.0, expected: Z_lowPr },
  { Pr: 15.0, Tr: 3.0, expected: STANDING_KATZ_DATA.Z_data[23][23] },
  { Pr: 0.2, Tr: 0.7, expected: STANDING_KATZ_DATA.Z_data[0][0] }
];

for (const test of tests) {
  const Z = calculateZFactorStandingKatz(test.Pr, test.Tr);
  const error = Math.abs(Z - test.expected);
  console.log(`  Pr=${test.Pr}, Tr=${test.Tr}: Z=${Z.toFixed(4)}, expected=${test.expected.toFixed(4)}, error=${error.toExponential(2)}`);

  if (error < 1e-10) {
    console.log(`  ✅ Exact grid point match`);
  } else if (error < 1e-6) {
    console.log(`  ⚠️  Small numerical error (acceptable)`);
  } else {
    issues.push(`Grid point mismatch: Pr=${test.Pr}, Tr=${test.Tr}, error=${error}`);
  }
}

// Test interpolation between grid points
console.log('\nInterpolation between grid points:');
const Z_interp1 = calculateZFactorStandingKatz(1.5, 1.25);
console.log(`  Pr=1.5, Tr=1.25: Z=${Z_interp1.toFixed(4)}`);
if (Z_interp1 > 0.8 && Z_interp1 < 1.0) {
  console.log(`  ✅ Interpolated value reasonable`);
} else {
  warnings.push(`Interpolated value seems off: ${Z_interp1}`);
}

// ============================================
// 4. BOUNDARY CONDITION TESTS
// ============================================
console.log('\n4. BOUNDARY CONDITION TESTS');
console.log('---------------------------');

// Test at boundaries
try {
  const Z_boundary1 = calculateZFactorStandingKatz(0.2, 0.7);
  console.log(`✅ Lower boundary (Pr=0.2, Tr=0.7): Z=${Z_boundary1.toFixed(4)}`);
} catch (e: any) {
  issues.push(`Failed at lower boundary: ${e}`);
}

try {
  const Z_boundary2 = calculateZFactorStandingKatz(15.0, 3.0);
  console.log(`✅ Upper boundary (Pr=15.0, Tr=3.0): Z=${Z_boundary2.toFixed(4)}`);
} catch (e: any) {
  issues.push(`Failed at upper boundary: ${e}`);
}

// Test just outside boundaries (should throw)
try {
  calculateZFactorStandingKatz(0.19, 1.0);
  warnings.push('Should have thrown for Pr=0.19');
} catch (e: any) {
  console.log(`✅ Correctly rejects Pr=0.19: ${e.message.substring(0, 50)}...`);
}

try {
  calculateZFactorStandingKatz(1.0, 0.69);
  warnings.push('Should have thrown for Tr=0.69');
} catch (e: any) {
  console.log(`✅ Correctly rejects Tr=0.69: ${e.message.substring(0, 50)}...`);
}

// ============================================
// 5. INTEGRATION WITH GASPROPERTIES
// ============================================
console.log('\n5. INTEGRATION WITH GASPROPERTIES');
console.log('---------------------------------');

// Test that GasProperties uses Standing-Katz
const P = 10e6;  // 10 MPa
const T = 313.15; // 40°C
const gamma = 0.65;

const Z_direct = GasProperties.calculateCompressibility(P, T, gamma);
console.log(`GasProperties.calculateCompressibility(${P/1e6} MPa, ${T} K, ${gamma}): Z=${Z_direct.toFixed(4)}`);

// Calculate what it should be
const Tpc = 169.2 + 349.5 * gamma - 74.0 * Math.pow(gamma, 2);
const Ppc = (4.892 - 0.4048 * gamma) * 1e6;
const Tr = T / Tpc;
const Pr = P / Ppc;
const Z_expected = calculateZFactorStandingKatz(Pr, Tr);

console.log(`Expected from Standing-Katz: Z=${Z_expected.toFixed(4)}`);
if (Math.abs(Z_direct - Z_expected) < 1e-6) {
  console.log('✅ GasProperties correctly using Standing-Katz');
} else {
  warnings.push(`GasProperties not using Standing-Katz: got ${Z_direct}, expected ${Z_expected}`);
}

// ============================================
// 6. PERFORMANCE CHECK
// ============================================
console.log('\n6. PERFORMANCE CHECK');
console.log('--------------------');

const iterations = 10000;
const start = Date.now();

for (let i = 0; i < iterations; i++) {
  const Pr_test = 0.2 + Math.random() * 14.8;
  const Tr_test = 0.7 + Math.random() * 2.3;
  calculateZFactorStandingKatz(Pr_test, Tr_test);
}

const elapsed = Date.now() - start;
const avgTime = elapsed / iterations;

console.log(`${iterations} interpolations in ${elapsed} ms`);
console.log(`Average time: ${avgTime.toFixed(3)} ms`);
if (avgTime < 0.1) {
  console.log('✅ Performance excellent (<0.1 ms per call)');
} else if (avgTime < 1.0) {
  console.log('⚠️  Performance acceptable but could be optimized');
} else {
  warnings.push(`Performance slow: ${avgTime.toFixed(2)} ms per call`);
}

// ============================================
// 7. SUMMARY
// ============================================
console.log('\n\n=== REVIEW SUMMARY ===');
console.log('=====================\n');

if (issues.length === 0) {
  console.log('✅ NO CRITICAL ISSUES FOUND');
} else {
  console.log(`❌ CRITICAL ISSUES: ${issues.length}`);
  issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
}

if (warnings.length === 0) {
  console.log('\n✅ NO WARNINGS');
} else {
  console.log(`\n⚠️  WARNINGS: ${warnings.length}`);
  warnings.forEach((warning, i) => console.log(`  ${i + 1}. ${warning}`));
}

console.log('\n\n=== IDENTIFIED IMPROVEMENTS ===');
console.log('==============================\n');

// List improvements
improvements.push('Add caching for repeated Pr, Tr queries to improve performance');
improvements.push('Add validation logging mode to track when fallback methods are used');
improvements.push('Consider pre-computing spline coefficients for even smoother interpolation');
improvements.push('Add unit tests for all edge cases (boundaries, exact grid points)');
improvements.push('Document the data source and digitization accuracy');
improvements.push('Add comparison plots vs. correlation methods to visualize improvement');

improvements.forEach((imp, i) => console.log(`${i + 1}. ${imp}`));

console.log('\n');
process.exit(issues.length > 0 ? 1 : 0);
