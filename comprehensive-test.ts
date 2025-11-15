/**
 * Comprehensive Integration Tests
 * Actually runs calculations and verifies results
 * Run with: npx tsx comprehensive-test.ts
 */

import { CalculatorService } from './services/calculatorService';
import { CalculationParams } from './types';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    testsFailed++;
  }
}

function assertRange(value: number, min: number, max: number, message: string) {
  if (value >= min && value <= max) {
    console.log(`✅ ${message}: ${value.toFixed(2)} in range [${min}, ${max}]`);
    testsPassed++;
  } else {
    console.error(`❌ FAILED: ${message}: ${value.toFixed(2)} NOT in range [${min}, ${max}]`);
    testsFailed++;
  }
}

console.log('\n=== COMPREHENSIVE INTEGRATION TESTS ===\n');

// ========================================
// TEST 1: LIQUID INJECTION - SIMPLE CASE
// ========================================
console.log('TEST 1: LIQUID INJECTION - Simple Vertical Well');
console.log('------------------------------------------------');

try {
  const liquidParams: CalculationParams = {
    injectionType: 'liquid',
    segments: [
      { id: 1, diameter: 100, length: 1000, roughness: 0.05 }, // 100mm, 1000m
    ],
    flowRate: 1000, // m³/day
    injectionPressure: 5000, // kPa
    bottomholePressure: 15000, // kPa
    fluidDensity: 1000, // kg/m³ (water)
    fluidViscosity: 0.001, // Pa·s (water)
    wellDepth: 1000, // m
    openHoleDiameter: 100, // mm
  };

  const liquidResult = CalculatorService.calculatePressureDrop(liquidParams);

  console.log(`  Injection pressure: ${liquidParams.injectionPressure} kPa`);
  console.log(`  Bottom pressure: ${liquidResult.bottomPressure.toFixed(1)} kPa`);
  console.log(`  Total friction loss: ${liquidResult.totalFrictionLoss.toFixed(1)} kPa`);
  console.log(`  Max velocity: ${liquidResult.maxSegmentVelocity.toFixed(2)} m/s`);
  console.log(`  Flow regime: ${liquidResult.segments[0].flowRegime}`);

  // Validation checks
  assert(liquidResult.segments.length === 1, 'Has 1 segment');
  assert(liquidResult.bottomPressure > 0, 'Bottom pressure is positive');
  assert(!isNaN(liquidResult.bottomPressure), 'Bottom pressure is not NaN');
  assert(isFinite(liquidResult.bottomPressure), 'Bottom pressure is finite');

  // Hydrostatic gain should be ~9.81 MPa for 1000m of water
  const hydrostaticGain = liquidResult.segments[0].hydrostaticGain;
  assertRange(hydrostaticGain, 9500, 10000, 'Hydrostatic gain reasonable');

  // Velocity should be reasonable for this flow rate
  const velocity = liquidResult.segments[0].velocity;
  assertRange(velocity, 0.1, 5, 'Velocity reasonable');

  // Friction loss should be positive and reasonable
  assert(liquidResult.totalFrictionLoss > 0, 'Friction loss is positive');
  assertRange(liquidResult.totalFrictionLoss, 50, 500, 'Friction loss reasonable');

  // Bottom pressure should be injection + hydrostatic - friction
  const expectedBottom = liquidParams.injectionPressure + hydrostaticGain - liquidResult.totalFrictionLoss;
  assertRange(liquidResult.bottomPressure, expectedBottom - 100, expectedBottom + 100, 'Pressure balance correct');

} catch (error: any) {
  console.error(`❌ EXCEPTION: ${error.message}`);
  testsFailed++;
}

// ========================================
// TEST 2: GAS INJECTION - HIGH PRESSURE
// ========================================
console.log('\n\nTEST 2: GAS INJECTION - High Pressure Gas');
console.log('------------------------------------------------');

try {
  const gasParams: CalculationParams = {
    injectionType: 'gas',
    segments: [
      { id: 1, diameter: 150, length: 2000, roughness: 0.05 },
    ],
    flowRate: 50000, // m³/day
    injectionPressure: 10000, // kPa (10 MPa)
    bottomholePressure: 20000, // kPa
    fluidDensity: 0, // Not used for gas (validator now ignores for gas type)
    fluidViscosity: 0, // Not used for gas (validator now ignores for gas type)
    wellDepth: 2000,
    openHoleDiameter: 150,
    gasSpecificGravity: 0.65,
    temperature: 288.15, // 15°C
  };

  const gasResult = CalculatorService.calculatePressureDrop(gasParams);

  console.log(`  Injection pressure: ${gasParams.injectionPressure} kPa`);
  console.log(`  Bottom pressure: ${gasResult.bottomPressure.toFixed(1)} kPa`);
  console.log(`  Average gas density: ${gasResult.averageGasDensity?.toFixed(2)} kg/m³`);
  console.log(`  Average Z-factor: ${gasResult.averageCompressibility?.toFixed(4)}`);
  console.log(`  Max velocity: ${gasResult.maxSegmentVelocity.toFixed(2)} m/s`);

  // Validation checks
  assert(gasResult.segments.length === 1, 'Has 1 segment');
  assert(gasResult.bottomPressure > 0, 'Bottom pressure is positive');
  assert(!isNaN(gasResult.bottomPressure), 'Bottom pressure is not NaN');
  assert(isFinite(gasResult.bottomPressure), 'Bottom pressure is finite');

  // Z-factor should be < 1.0 at high pressure
  if (gasResult.averageCompressibility) {
    assertRange(gasResult.averageCompressibility, 0.5, 1.0, 'Z-factor reasonable for high pressure');
  }

  // Gas density should be reasonable
  if (gasResult.averageGasDensity) {
    assertRange(gasResult.averageGasDensity, 20, 150, 'Gas density reasonable');
  }

  // Check for temperature in results
  if (gasResult.segments[0].temperature) {
    console.log(`  Temperature: ${gasResult.segments[0].temperature.toFixed(1)} K`);
    assertRange(gasResult.segments[0].temperature, 280, 400, 'Temperature reasonable');
  }

  // Check for compressibility in results
  if (gasResult.segments[0].compressibility) {
    assertRange(gasResult.segments[0].compressibility, 0.2, 1.5, 'Segment Z-factor in bounds');
  }

} catch (error: any) {
  console.error(`❌ EXCEPTION: ${error.message}`);
  testsFailed++;
}

// ========================================
// TEST 3: MULTIPHASE - SLUG FLOW
// ========================================
console.log('\n\nTEST 3: MULTIPHASE INJECTION - Slug Flow');
console.log('------------------------------------------------');

try {
  const multiphaseParams: CalculationParams = {
    injectionType: 'multiphase',
    segments: [
      { id: 1, diameter: 100, length: 1500, roughness: 0.05 },
    ],
    flowRate: 0, // Not used for multiphase
    injectionPressure: 5000, // kPa
    bottomholePressure: 15000, // kPa
    fluidDensity: 1000, // kg/m³ (liquid phase)
    fluidViscosity: 0.001, // Pa·s (liquid)
    wellDepth: 1500,
    openHoleDiameter: 100,
    gasFlowRate: 5000, // m³/day
    liquidFlowRate: 500, // m³/day
    gasSpecificGravity: 0.65,
    temperature: 288.15,
    surfaceTension: 0.072, // Water-air
  };

  const mpResult = CalculatorService.calculatePressureDrop(multiphaseParams);

  console.log(`  Gas flow rate: ${multiphaseParams.gasFlowRate} m³/day`);
  console.log(`  Liquid flow rate: ${multiphaseParams.liquidFlowRate} m³/day`);
  console.log(`  Bottom pressure: ${mpResult.bottomPressure.toFixed(1)} kPa`);
  console.log(`  Average void fraction: ${mpResult.averageVoidFraction?.toFixed(3)}`);
  console.log(`  Flow pattern: ${mpResult.segments[0].flowPattern}`);
  console.log(`  Mixture velocity: ${mpResult.segments[0].velocity.toFixed(2)} m/s`);

  // Check actual phase velocities
  if (mpResult.segments[0].actualGasVelocity) {
    console.log(`  Actual gas velocity: ${mpResult.segments[0].actualGasVelocity.toFixed(2)} m/s`);
  }
  if (mpResult.segments[0].actualLiquidVelocity) {
    console.log(`  Actual liquid velocity: ${mpResult.segments[0].actualLiquidVelocity.toFixed(2)} m/s`);
  }

  // Validation checks
  assert(mpResult.segments.length === 1, 'Has 1 segment');
  assert(mpResult.bottomPressure > 0, 'Bottom pressure is positive');
  assert(!isNaN(mpResult.bottomPressure), 'Bottom pressure is not NaN');
  assert(isFinite(mpResult.bottomPressure), 'Bottom pressure is finite');

  // Void fraction should be between 0 and 1
  if (mpResult.averageVoidFraction !== undefined) {
    assertRange(mpResult.averageVoidFraction, 0, 1, 'Void fraction in [0,1]');
  }

  // Flow pattern should be defined
  assert(mpResult.segments[0].flowPattern !== undefined, 'Flow pattern determined');
  console.log(`  ✅ Flow pattern: ${mpResult.segments[0].flowPattern}`);

  // Actual velocities should be > superficial velocities
  if (mpResult.segments[0].actualGasVelocity && mpResult.segments[0].actualLiquidVelocity) {
    // Both should be positive
    assert(mpResult.segments[0].actualGasVelocity > 0, 'Actual gas velocity positive');
    assert(mpResult.segments[0].actualLiquidVelocity > 0, 'Actual liquid velocity positive');
  }

} catch (error: any) {
  console.error(`❌ EXCEPTION: ${error.message}`);
  testsFailed++;
}

// ========================================
// TEST 4: MULTIPLE SEGMENTS - DIAMETER CHANGE
// ========================================
console.log('\n\nTEST 4: LIQUID - Multiple Segments with Diameter Change');
console.log('------------------------------------------------');

try {
  const multiSegParams: CalculationParams = {
    injectionType: 'liquid',
    segments: [
      { id: 1, diameter: 150, length: 500, roughness: 0.05 }, // Large pipe
      { id: 2, diameter: 100, length: 500, roughness: 0.05 }, // Contraction
      { id: 3, diameter: 150, length: 500, roughness: 0.05 }, // Expansion
    ],
    flowRate: 1000,
    injectionPressure: 3000,
    bottomholePressure: 10000,
    fluidDensity: 1000,
    fluidViscosity: 0.001,
    wellDepth: 1500,
    openHoleDiameter: 150,
  };

  const multiResult = CalculatorService.calculatePressureDrop(multiSegParams);

  console.log(`  Number of segments: ${multiResult.segments.length}`);
  for (let i = 0; i < multiResult.segments.length; i++) {
    const seg = multiResult.segments[i];
    console.log(`  Segment ${i+1}: D=${seg.diameter}mm, V=${seg.velocity.toFixed(2)}m/s, ΔP=${seg.netPressureChange.toFixed(1)}kPa`);
  }

  // Validation
  assert(multiResult.segments.length === 3, 'Has 3 segments');

  // Continuity check: velocity should scale with area
  const v1 = multiResult.segments[0].velocity;
  const v2 = multiResult.segments[1].velocity;
  const d1 = multiResult.segments[0].diameter;
  const d2 = multiResult.segments[1].diameter;

  // Q = V * A, so V2/V1 = (D1/D2)²
  const velocityRatio = v2 / v1;
  const expectedRatio = Math.pow(d1 / d2, 2);

  console.log(`  Velocity ratio V2/V1: ${velocityRatio.toFixed(3)}`);
  console.log(`  Expected from continuity: ${expectedRatio.toFixed(3)}`);

  assertRange(velocityRatio, expectedRatio * 0.95, expectedRatio * 1.05, 'Continuity preserved (within 5%)');

  // All pressures should be positive
  for (let i = 0; i < multiResult.segments.length; i++) {
    assert(multiResult.segments[i].outletPressure > 0, `Segment ${i+1} outlet pressure positive`);
  }

} catch (error: any) {
  console.error(`❌ EXCEPTION: ${error.message}`);
  testsFailed++;
}

// ========================================
// TEST 5: EDGE CASE - VERY LOW FLOW
// ========================================
console.log('\n\nTEST 5: EDGE CASE - Very Low Flow Rate');
console.log('------------------------------------------------');

try {
  const lowFlowParams: CalculationParams = {
    injectionType: 'liquid',
    segments: [
      { id: 1, diameter: 100, length: 1000, roughness: 0.05 },
    ],
    flowRate: 10, // Very low: 10 m³/day
    injectionPressure: 5000,
    bottomholePressure: 15000,
    fluidDensity: 1000,
    fluidViscosity: 0.001,
    wellDepth: 1000,
    openHoleDiameter: 100,
  };

  const lowFlowResult = CalculatorService.calculatePressureDrop(lowFlowParams);

  console.log(`  Flow rate: ${lowFlowParams.flowRate} m³/day`);
  console.log(`  Velocity: ${lowFlowResult.segments[0].velocity.toFixed(4)} m/s`);
  console.log(`  Reynolds: ${lowFlowResult.segments[0].reynoldsNumber.toFixed(0)}`);
  console.log(`  Flow regime: ${lowFlowResult.segments[0].flowRegime}`);
  console.log(`  Friction loss: ${lowFlowResult.totalFrictionLoss.toFixed(2)} kPa`);

  assert(!isNaN(lowFlowResult.bottomPressure), 'Low flow: No NaN');
  assert(isFinite(lowFlowResult.bottomPressure), 'Low flow: Finite result');
  assert(lowFlowResult.bottomPressure > 0, 'Low flow: Positive pressure');

  // Should be laminar at very low flow
  assert(lowFlowResult.segments[0].reynoldsNumber < 4000, 'Low Re (likely laminar or transitional)');

} catch (error: any) {
  console.error(`❌ EXCEPTION: ${error.message}`);
  testsFailed++;
}

// ========================================
// TEST 6: INPUT VALIDATION - Should FAIL
// ========================================
console.log('\n\nTEST 6: INPUT VALIDATION - Invalid Inputs');
console.log('------------------------------------------------');

// Test negative flow rate
try {
  const invalidParams: CalculationParams = {
    injectionType: 'liquid',
    segments: [{ id: 1, diameter: 100, length: 1000, roughness: 0.05 }],
    flowRate: -100, // NEGATIVE!
    injectionPressure: 5000,
    bottomholePressure: 15000,
    fluidDensity: 1000,
    fluidViscosity: 0.001,
    wellDepth: 1000,
    openHoleDiameter: 100,
  };

  CalculatorService.calculatePressureDrop(invalidParams);
  console.error('❌ FAILED: Should have thrown error for negative flow rate');
  testsFailed++;
} catch (error: any) {
  console.log('✅ Correctly rejected negative flow rate');
  testsPassed++;
}

// Test zero diameter
try {
  const zeroDiamParams: CalculationParams = {
    injectionType: 'liquid',
    segments: [{ id: 1, diameter: 0, length: 1000, roughness: 0.05 }], // ZERO diameter
    flowRate: 100,
    injectionPressure: 5000,
    bottomholePressure: 15000,
    fluidDensity: 1000,
    fluidViscosity: 0.001,
    wellDepth: 1000,
    openHoleDiameter: 100,
  };

  CalculatorService.calculatePressureDrop(zeroDiamParams);
  console.error('❌ FAILED: Should have thrown error for zero diameter');
  testsFailed++;
} catch (error: any) {
  console.log('✅ Correctly rejected zero diameter');
  testsPassed++;
}

// ========================================
// SUMMARY
// ========================================
console.log('\n\n=== TEST SUMMARY ===');
console.log(`Total tests passed: ${testsPassed}`);
console.log(`Total tests failed: ${testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✅ ALL TESTS PASSED!\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${testsFailed} TESTS FAILED!\n`);
  process.exit(1);
}
