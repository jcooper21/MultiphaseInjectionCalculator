// This is a test file. It is not meant to be run in the browser.
// It uses a jest-like syntax for demonstration purposes.

import { CalculatorService } from './calculatorService';
import { CalculationParams } from '../types';

// Mock test functions for demonstration as a test runner is not available.
const describe = (name: string, fn: () => void) => {
  console.log(`--- Running test suite: ${name} ---`);
  fn();
};
const it = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    console.error(`  ✗ ${name}`);
    console.error(e.message);
  }
};
const expect = (actual: any) => ({
  toBe: (expected: any) => { if (actual !== expected) throw new Error(`Expected ${actual} to be ${expected}`); },
  toBeCloseTo: (expected: number, precision: number = 2) => {
    const pass = Math.abs(expected - actual) < (Math.pow(10, -precision) / 2);
    if (!pass) throw new Error(`Expected ${actual} to be close to ${expected}`);
  }
});

describe('CalculatorService', () => {
  describe('calculatePressureDrop', () => {
    it('should calculate pressure drop for a simple case', () => {
      const params: CalculationParams = {
        segments: [{ id: 1, diameter: 100, length: 1000, roughness: 0.05 }],
        flowRate: 1000, // m3/day
        injectionPressure: 5000, // kPa
        bottomholePressure: 15000, // kPa
        fluidDensity: 1000, // kg/m3
        fluidViscosity: 0.001, // Pa.s
        wellDepth: 1000,
        openHoleDiameter: 0,
      };
      const results = CalculatorService.calculatePressureDrop(params);
      expect(results.bottomPressure).toBeCloseTo(14781.9, 1);
      expect(results.totalFrictionLoss).toBeCloseTo(218.0, 1);
      expect(results.segments[0].velocity).toBeCloseTo(1.48, 2);
      expect(results.segments[0].flowRegime).toBe('Turbulent');
    });

    it('should handle zero flow rate', () => {
        const params: CalculationParams = {
          segments: [{ id: 1, diameter: 100, length: 1000, roughness: 0.05 }],
          flowRate: 0,
          injectionPressure: 5000,
          bottomholePressure: 15000,
          fluidDensity: 1000,
          fluidViscosity: 0.001,
          wellDepth: 1000,
          openHoleDiameter: 0,
        };
        const results = CalculatorService.calculatePressureDrop(params);
        expect(results.bottomPressure).toBeCloseTo(14810, 0); // Injection pressure + hydrostatic
        expect(results.totalFrictionLoss).toBeCloseTo(0, 1);
        expect(results.maxSegmentVelocity).toBeCloseTo(0, 1);
        expect(results.maxFlowRate).toBe(Infinity);
      });
  });
});
