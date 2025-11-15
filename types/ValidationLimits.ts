/**
 * Validation Limits Configuration
 *
 * Allows customization of validation ranges for specialized applications.
 * See VALIDATION_RANGES.md for detailed explanations of each limit.
 */

export interface ValidationLimits {
  /**
   * Maximum gas velocity (m/s)
   * Default: 150 m/s (~M=0.5 for safety)
   * Typical: 10-50 m/s
   * Increase for: High-pressure venting scenarios
   */
  gasVelocityMax?: number;

  /**
   * Maximum liquid velocity (m/s)
   * Default: 50 m/s (well above erosion limits)
   * Typical: 1-5 m/s
   * Increase for: Clean fluids, transient analysis
   */
  liquidVelocityMax?: number;

  /**
   * Minimum gas density (kg/m³)
   * Default: 5 kg/m³
   * Typical: 10-50 kg/m³ for low pressure
   * Decrease for: Very low pressure scenarios
   */
  densityMin?: number;

  /**
   * Maximum gas density (kg/m³)
   * Default: 300 kg/m³
   * Typical: 50-150 kg/m³
   * Increase for: Ultra-high pressure (>100 MPa)
   */
  densityMax?: number;

  /**
   * Minimum temperature (K)
   * Default: 250 K (-23°C)
   * Typical: 280-320 K
   * Decrease for: Arctic, permafrost conditions
   */
  temperatureMin?: number;

  /**
   * Maximum temperature (K)
   * Default: 450 K (177°C)
   * Typical: 300-400 K
   * Increase for: Geothermal wells, ultra-deep wells (>5 km)
   */
  temperatureMax?: number;

  /**
   * Maximum pressure (Pa)
   * Default: 200e6 Pa (200 MPa, 29,000 psi)
   * Typical: 10e6-50e6 Pa
   * Increase for: Ultra-deep injection, specialized equipment
   */
  pressureMax?: number;

  /**
   * Minimum Z-factor
   * Default: 0.2
   * Typical: 0.3-0.9
   * Physical minimum: ~0.25 near critical point
   */
  zFactorMin?: number;

  /**
   * Maximum Z-factor
   * Default: 1.5
   * Typical: 0.7-1.3
   * Increase for: Very high pressure/temperature
   */
  zFactorMax?: number;

  /**
   * Maximum Reynolds number
   * Default: 1e8
   * Typical: 1e4-1e6
   * Based on: Colebrook-White correlation validity
   */
  reynoldsMax?: number;
}

/**
 * Default validation limits for typical petroleum engineering applications
 * Suitable for 95%+ of cases
 */
export const DEFAULT_VALIDATION_LIMITS: Required<ValidationLimits> = {
  gasVelocityMax: 150,      // m/s
  liquidVelocityMax: 50,    // m/s
  densityMin: 5,            // kg/m³
  densityMax: 300,          // kg/m³
  temperatureMin: 250,      // K (-23°C)
  temperatureMax: 450,      // K (177°C)
  pressureMax: 200e6,       // Pa (200 MPa)
  zFactorMin: 0.2,          // dimensionless
  zFactorMax: 1.5,          // dimensionless
  reynoldsMax: 1e8          // dimensionless
};

/**
 * Preset validation limits for common scenarios
 */
export const VALIDATION_PRESETS = {
  /**
   * Standard petroleum engineering (default)
   */
  STANDARD: DEFAULT_VALIDATION_LIMITS,

  /**
   * Geothermal wells - higher temperature limit
   */
  GEOTHERMAL: {
    ...DEFAULT_VALIDATION_LIMITS,
    temperatureMin: 300,    // 27°C
    temperatureMax: 600,    // 327°C (geothermal)
  },

  /**
   * Arctic conditions - lower temperature limit
   */
  ARCTIC: {
    ...DEFAULT_VALIDATION_LIMITS,
    temperatureMin: 230,    // -43°C (permafrost)
    temperatureMax: 350,    // 77°C (shallower, colder)
  },

  /**
   * Ultra-deep wells - higher pressure and temperature
   */
  ULTRA_DEEP: {
    ...DEFAULT_VALIDATION_LIMITS,
    temperatureMin: 300,    // 27°C
    temperatureMax: 550,    // 277°C (7-8 km depth)
    pressureMax: 300e6,     // 300 MPa (ultra-high pressure)
    densityMax: 400,        // kg/m³ (denser at high P)
  },

  /**
   * Low pressure operations
   */
  LOW_PRESSURE: {
    ...DEFAULT_VALIDATION_LIMITS,
    densityMin: 1,          // kg/m³ (near atmospheric)
    densityMax: 100,        // kg/m³
    pressureMax: 50e6,      // 50 MPa
  },

  /**
   * CO₂ injection - wider range due to supercritical behavior
   */
  CO2_INJECTION: {
    ...DEFAULT_VALIDATION_LIMITS,
    temperatureMin: 280,    // 7°C
    temperatureMax: 400,    // 127°C
    zFactorMin: 0.15,       // CO₂ can have lower Z near critical
    zFactorMax: 1.8,        // CO₂ can have higher Z at high P/T
    densityMax: 500,        // kg/m³ (supercritical CO₂)
  }
};

/**
 * Merge user-provided limits with defaults
 */
export function mergeValidationLimits(
  userLimits: Partial<ValidationLimits> = {}
): Required<ValidationLimits> {
  return { ...DEFAULT_VALIDATION_LIMITS, ...userLimits };
}

/**
 * Validate that limits make physical sense
 */
export function validateLimits(limits: Required<ValidationLimits>): void {
  if (limits.gasVelocityMax <= 0) {
    throw new Error('gasVelocityMax must be positive');
  }
  if (limits.liquidVelocityMax <= 0) {
    throw new Error('liquidVelocityMax must be positive');
  }
  if (limits.densityMin >= limits.densityMax) {
    throw new Error('densityMin must be < densityMax');
  }
  if (limits.temperatureMin >= limits.temperatureMax) {
    throw new Error('temperatureMin must be < temperatureMax');
  }
  if (limits.temperatureMin < 0) {
    throw new Error('temperatureMin must be positive (Kelvin scale)');
  }
  if (limits.pressureMax <= 0) {
    throw new Error('pressureMax must be positive');
  }
  if (limits.zFactorMin >= limits.zFactorMax) {
    throw new Error('zFactorMin must be < zFactorMax');
  }
  if (limits.zFactorMin <= 0) {
    throw new Error('zFactorMin must be positive');
  }
  if (limits.reynoldsMax <= 0) {
    throw new Error('reynoldsMax must be positive');
  }
}
