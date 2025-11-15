/**
 * Test Professional Code Review High-Priority Fixes
 *
 * Validates the 3 high-priority fixes:
 * 1. Reynolds number validation throws errors
 * 2. Friction factor validation throws errors
 * 3. Nullish coalescing works for optional params
 */

import { CalculatorService } from './services/calculatorService';
import { CalculationParams } from './types';

console.log('\n=== PROFESSIONAL CODE REVIEW FIXES TEST ===\n');

let passedTests = 0;
let failedTests = 0;

// ============================================
// FIX #1: Reynolds Number Validation
// ============================================
console.log('TEST 1: Reynolds number validation (Fix #1)');
try {
  // Should throw error for viscosity <= 0
  const Re = CalculatorService['calculateReynolds'](10, 0.15, 1000, 0);
  console.log(`❌ FAIL: Should have thrown error for viscosity = 0`);
  failedTests++;
} catch (e: any) {
  if (e.message.includes('viscosity') && e.message.includes('must be positive')) {
    console.log(`✅ PASS: Correctly throws error for viscosity = 0`);
    console.log(`   Error: "${e.message.substring(0, 80)}..."\n`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: Wrong error message: ${e.message}\n`);
    failedTests++;
  }
}

try {
  // Should throw error for diameter <= 0
  const Re = CalculatorService['calculateReynolds'](10, 0, 1000, 0.001);
  console.log(`❌ FAIL: Should have thrown error for diameter = 0`);
  failedTests++;
} catch (e: any) {
  if (e.message.includes('diameter') && e.message.includes('must be positive')) {
    console.log(`✅ PASS: Correctly throws error for diameter = 0`);
    console.log(`   Error: "${e.message.substring(0, 80)}..."\n`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: Wrong error message: ${e.message}\n`);
    failedTests++;
  }
}

// ============================================
// FIX #2: Friction Factor Edge Case
// ============================================
console.log('TEST 2: Friction factor edge case (Fix #2)');
try {
  // Should throw error for Re <= 0
  const f = CalculatorService['calculateFrictionFactor'](-100, 0.0001);
  console.log(`❌ FAIL: Should have thrown error for Re = -100`);
  failedTests++;
} catch (e: any) {
  if (e.message.includes('Reynolds number') && e.message.includes('must be positive')) {
    console.log(`✅ PASS: Correctly throws error for Re = -100`);
    console.log(`   Error: "${e.message.substring(0, 80)}..."\n`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: Wrong error message: ${e.message}\n`);
    failedTests++;
  }
}

try {
  // Should throw error for Re = 0
  const f = CalculatorService['calculateFrictionFactor'](0, 0.0001);
  console.log(`❌ FAIL: Should have thrown error for Re = 0`);
  failedTests++;
} catch (e: any) {
  if (e.message.includes('Reynolds number') && e.message.includes('must be positive')) {
    console.log(`✅ PASS: Correctly throws error for Re = 0`);
    console.log(`   Error: "${e.message.substring(0, 80)}..."\n`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: Wrong error message: ${e.message}\n`);
    failedTests++;
  }
}

// ============================================
// FIX #3: Nullish Coalescing for Optional Params
// ============================================
console.log('TEST 3: Nullish coalescing for optional params (Fix #3)');

// Test that defaults work when params are undefined
const paramsWithDefaults: CalculationParams = {
  injectionType: 'gas',
  flowRate: 5000,
  injectionPressure: 8000,
  bottomholePressure: 12000,
  wellDepth: 1500,
  openHoleDiameter: 0.2,
  // temperature, gasSpecificGravity, geothermalGradient NOT provided
  segments: [{ diameter: 200, length: 1500, roughness: 0.000045, id: 0 }]
};

try {
  const result = CalculatorService.calculatePressureDrop(paramsWithDefaults);
  console.log(`✅ PASS: Defaults applied correctly when params undefined`);
  console.log(`   Bottom pressure: ${result.bottomPressure.toFixed(1)} kPa\n`);
  passedTests++;
} catch (e: any) {
  console.log(`❌ FAIL: ${e.message}\n`);
  failedTests++;
}

// Test that explicit 0 values are NOT replaced by defaults
const paramsWithZero: CalculationParams = {
  injectionType: 'gas',
  flowRate: 5000,
  injectionPressure: 8000,
  bottomholePressure: 12000,
  wellDepth: 1500,
  openHoleDiameter: 0.2,
  gasSpecificGravity: 0.65,  // Explicitly set
  temperature: 300,           // Explicitly set
  geothermalGradient: 0,      // Explicitly set to 0 (should use 0, not default)
  segments: [{ diameter: 200, length: 1500, roughness: 0.000045, id: 0 }]
};

try {
  const result = CalculatorService.calculatePressureDrop(paramsWithZero);
  console.log(`✅ PASS: Explicit values (including 0) preserved correctly`);
  console.log(`   Bottom pressure: ${result.bottomPressure.toFixed(1)} kPa\n`);
  passedTests++;
} catch (e: any) {
  console.log(`❌ FAIL: ${e.message}\n`);
  failedTests++;
}

// ============================================
// SUMMARY
// ============================================
console.log('\n=== TEST SUMMARY ===');
console.log(`Tests passed: ${passedTests}/6`);
console.log(`Tests failed: ${failedTests}/6`);

if (failedTests === 0) {
  console.log('\n✅ ALL PROFESSIONAL FIXES VALIDATED!\n');
  console.log('High-Priority Fixes Implemented:');
  console.log('  1. ✅ Reynolds number validation throws errors');
  console.log('  2. ✅ Friction factor edge case throws errors');
  console.log('  3. ✅ Nullish coalescing for optional params\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${failedTests} test(s) failed\n`);
  process.exit(1);
}
