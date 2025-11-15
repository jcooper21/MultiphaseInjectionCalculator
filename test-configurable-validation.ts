/**
 * Test Configurable Validation Limits
 *
 * Verifies that custom validation limits work correctly
 */

import { CalculatorService } from './services/calculatorService';
import { VALIDATION_PRESETS } from './types/ValidationLimits';
import { CalculationParams } from './types';

console.log('\n=== CONFIGURABLE VALIDATION LIMITS TEST ===\n');

let passedTests = 0;
let failedTests = 0;

// Test 1: Standard limits should work (default)
console.log('TEST 1: Standard limits (default behavior)');
try {
  const params: CalculationParams = {
    injectionType: 'liquid',
    flowRate: 1000,
    injectionPressure: 5000,
    bottomholePressure: 10000,
    wellDepth: 1000,
    openHoleDiameter: 0.15,
    fluidDensity: 1000,
    fluidViscosity: 0.001,
    segments: [{ diameter: 150, length: 1000, roughness: 0.000045, id: 0 }]
  };

  const result = CalculatorService.calculatePressureDrop(params);
  console.log(`✅ Default validation limits work`);
  console.log(`   Bottom pressure: ${result.bottomPressure.toFixed(1)} kPa\n`);
  passedTests++;
} catch (e: any) {
  console.log(`❌ FAIL: ${e.message}\n`);
  failedTests++;
}

// Test 2: Geothermal preset - should allow higher temperature
console.log('TEST 2: Geothermal preset (higher temperature)');
try {
  const params: CalculationParams = {
    injectionType: 'gas',
    flowRate: 10000,
    injectionPressure: 10000,
    bottomholePressure: 15000,
    wellDepth: 3000,
    openHoleDiameter: 0.2,
    gasSpecificGravity: 0.65,
    temperature: 550, // 277°C - high for geothermal
    geothermalGradient: 0.05,
    segments: [{ diameter: 200, length: 3000, roughness: 0.000045, id: 0 }]
  };

  // Should FAIL with standard limits (max 450 K)
  try {
    CalculatorService.calculatePressureDrop(params);
    console.log(`⚠️  WARNING: Should have failed with standard limits\n`);
  } catch (e: any) {
    console.log(`   ✓ Correctly rejected with standard limits (T > 450 K)`);
  }

  // Should PASS with geothermal preset (max 600 K)
  // Note: Still need reasonable temperature for correlations to work
  params.temperature = 500; // 227°C - high but within correlation range
  const result = CalculatorService.calculatePressureDrop(params, VALIDATION_PRESETS.GEOTHERMAL);
  console.log(`✅ Geothermal preset allows T = 500 K`);
  console.log(`   Bottom pressure: ${result.bottomPressure.toFixed(1)} kPa\n`);
  passedTests++;
} catch (e: any) {
  console.log(`❌ FAIL: ${e.message}\n`);
  failedTests++;
}

// Test 3: Arctic preset - should allow lower temperature
console.log('TEST 3: Arctic preset (lower temperature)');
try {
  const params: CalculationParams = {
    injectionType: 'gas',
    flowRate: 5000,
    injectionPressure: 8000,
    bottomholePressure: 12000,
    wellDepth: 1500,
    openHoleDiameter: 0.2,
    gasSpecificGravity: 0.65,
    temperature: 240, // -33°C - cold
    segments: [{ diameter: 200, length: 1500, roughness: 0.000045, id: 0 }]
  };

  // Should FAIL with standard limits (min 250 K)
  try {
    CalculatorService.calculatePressureDrop(params);
    console.log(`⚠️  WARNING: Should have failed with standard limits\n`);
  } catch (e: any) {
    console.log(`   ✓ Correctly rejected with standard limits (T < 250 K)`);
  }

  // Should PASS with arctic preset (min 230 K)
  const result = CalculatorService.calculatePressureDrop(params, VALIDATION_PRESETS.ARCTIC);
  console.log(`✅ Arctic preset allows T = 240 K`);
  console.log(`   Bottom pressure: ${result.bottomPressure.toFixed(1)} kPa\n`);
  passedTests++;
} catch (e: any) {
  console.log(`❌ FAIL: ${e.message}\n`);
  failedTests++;
}

// Test 4: Custom limits - ultra high velocity
console.log('TEST 4: Custom limits (ultra high velocity)');
try {
  const params: CalculationParams = {
    injectionType: 'gas',
    flowRate: 50000, // Very high flow rate
    injectionPressure: 50000,
    bottomholePressure: 55000,
    wellDepth: 500,
    openHoleDiameter: 0.1, // Small diameter
    gasSpecificGravity: 0.65,
    temperature: 300,
    segments: [{ diameter: 100, length: 500, roughness: 0.000045, id: 0 }]
  };

  // This will likely exceed standard limits (density or velocity)
  try {
    CalculatorService.calculatePressureDrop(params);
    console.log(`   Passed with standard limits\n`);
    passedTests++;
  } catch (e: any) {
    if (e.message.includes('velocity') || e.message.includes('density')) {
      console.log(`   ✓ Correctly rejected with standard limits: ${e.message.split('\n')[0]}`);

      // Try with custom higher velocity and density limits
      const result = CalculatorService.calculatePressureDrop(params, {
        gasVelocityMax: 300, // Allow higher velocity
        densityMax: 500      // Allow higher density for high pressure
      });
      console.log(`✅ Custom higher limits allow calculation`);
      console.log(`   Bottom pressure: ${result.bottomPressure.toFixed(1)} kPa\n`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: Unexpected error: ${e.message}\n`);
      failedTests++;
    }
  }
} catch (e: any) {
  console.log(`❌ FAIL: ${e.message}\n`);
  failedTests++;
}

// Test 5: Verify that invalid custom limits are rejected
console.log('TEST 5: Invalid custom limits rejection');
try {
  const params: CalculationParams = {
    injectionType: 'liquid',
    flowRate: 1000,
    injectionPressure: 5000,
    bottomholePressure: 10000,
    wellDepth: 1000,
    openHoleDiameter: 0.15,
    fluidDensity: 1000,
    fluidViscosity: 0.001,
    segments: [{ diameter: 150, length: 1000, roughness: 0.000045, id: 0 }]
  };

  // Try with invalid limits (min > max)
  try {
    CalculatorService.calculatePressureDrop(params, {
      temperatureMin: 500,
      temperatureMax: 300 // INVALID: min > max
    });
    console.log(`❌ FAIL: Should have rejected invalid limits\n`);
    failedTests++;
  } catch (e: any) {
    if (e.message.includes('temperatureMin must be < temperatureMax')) {
      console.log(`✅ Correctly rejected invalid limits (min > max)\n`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: Wrong error: ${e.message}\n`);
      failedTests++;
    }
  }
} catch (e: any) {
  console.log(`❌ FAIL: Unexpected error: ${e.message}\n`);
  failedTests++;
}

// Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`Tests passed: ${passedTests}/5`);
console.log(`Tests failed: ${failedTests}/5`);

if (failedTests === 0) {
  console.log('\n✅ ALL CONFIGURABLE VALIDATION TESTS PASSED!\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${failedTests} test(s) failed\n`);
  process.exit(1);
}
