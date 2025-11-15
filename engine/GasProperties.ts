/**
 * Gas Properties Module
 * Handles calculation of gas properties for single-phase gas injection
 */

// Gas constant (J/(mol·K))
const R_UNIVERSAL = 8.314;

// Standard conditions
const T_STANDARD = 273.15; // K (0°C)
const P_STANDARD = 101.325; // kPa

export class GasProperties {
  /**
   * Calculate gas density using real gas equation of state
   * ρ = (P * M * γg) / (Z * R * T)
   * @param pressure Pressure in Pa
   * @param temperature Temperature in K
   * @param specificGravity Specific gravity (relative to air)
   * @param compressibility Z-factor
   * @returns Gas density in kg/m³
   */
  static calculateGasDensity(
    pressure: number,
    temperature: number,
    specificGravity: number,
    compressibility: number = 1.0
  ): number {
    // Molecular weight of air = 28.97 g/mol
    const M_air = 28.97;
    const M_gas = specificGravity * M_air;

    // Convert to SI units for gas constant per kg: R_specific = R_universal / M
    const R_specific = (R_UNIVERSAL * 1000) / M_gas; // J/(kg·K)

    // ρ = P / (Z * R_specific * T)
    const density = pressure / (compressibility * R_specific * temperature);

    return density;
  }

  /**
   * Calculate gas compressibility factor (Z-factor)
   * Uses simplified Beggs-Brill correlation - industry standard
   * @param pressure Pressure in Pa
   * @param temperature Temperature in K
   * @param specificGravity Specific gravity
   * @returns Z-factor (dimensionless)
   */
  static calculateCompressibility(
    pressure: number,
    temperature: number,
    specificGravity: number
  ): number {
    // Estimate pseudo-critical properties (Sutton correlations)
    const Tpc = 169.2 + 349.5 * specificGravity - 74.0 * Math.pow(specificGravity, 2); // K
    const Ppc = (4.892 - 0.4048 * specificGravity) * 1e6; // Pa

    // Calculate reduced properties
    const Tr = temperature / Tpc;
    const Pr = pressure / Ppc;

    // For very low pressure, ideal gas
    if (Pr < 0.2) {
      return 1.0;
    }

    // PRODUCTION FIX: Use appropriate correlations for both super- and sub-critical conditions
    // Valid for 0.2 < Pr < 15 and 0.9 < Tr < 3.0
    let Z: number;

    if (Tr >= 1.0) {
      // Supercritical: Use Beggs-Brill explicit equation
      const A = 1.39 * (Math.pow(Tr - 0.92, 0.5)) - 0.36 * Tr - 0.101;
      const B = (0.62 - 0.23 * Tr) * Pr +
                (0.066 / (Tr - 0.86) - 0.037) * Pr * Pr +
                0.32 * Math.pow(Pr, 6) / Math.pow(10, 9 * (Tr - 1));
      const C = 0.132 - 0.32 * Math.log10(Tr);
      const D = Math.pow(10, 0.3106 - 0.49 * Tr + 0.1824 * Tr * Tr);

      Z = A + (1 - A) / Math.exp(B) + C * Math.pow(Pr, D);
    } else {
      // Subcritical (Tr < 1.0): Use Hall-Yarborough correlation
      // Common in cooler climates, shallower wells, or heavier gases
      // Accuracy: ±2% vs Standing-Katz charts (vs ±10% for simplified correlation)

      const t = 1.0 / Tr;
      const A = 0.06125 * t * Math.exp(-1.2 * Math.pow(1 - t, 2));

      // Newton-Raphson iteration for reduced density (y)
      let y = 0.001; // Initial guess

      for (let iter = 0; iter < 15; iter++) {
        const y2 = y * y;
        const y3 = y2 * y;
        const y4 = y3 * y;

        const B = t * (14.76 - 9.76 * t + 4.58 * t * t);
        const C = t * (90.7 - 242.2 * t + 42.4 * t * t);
        const D = 2.18 + 2.82 * t;

        const F = -A * Pr +
                  (y + y2 + y3 - y4) / Math.pow(1 - y, 3) -
                  B * y2 +
                  C * Math.pow(y, D);

        const dFdy = (1 + 4*y + 4*y2 - 4*y3 + y4) / Math.pow(1 - y, 4) -
                     2 * B * y +
                     D * C * Math.pow(y, D - 1);

        const y_new = y - F / dFdy;

        // Constrain y to valid range
        y = Math.max(0.001, Math.min(0.95, y_new));

        // Check convergence
        if (Math.abs(y_new - y) < 1e-8) {
          break;
        }
      }

      Z = A * Pr / y;
    }

    // Constrain to physically reasonable range with warning
    if (Z < 0.5 || Z > 1.2) {
      console.warn(
        `Z-factor ${Z.toFixed(3)} outside normal range [0.5, 1.2] at ` +
        `Pr=${Pr.toFixed(2)}, Tr=${Tr.toFixed(2)}. Clamping to valid range.`
      );
    }
    return Math.max(0.5, Math.min(1.2, Z));
  }

  /**
   * Calculate gas viscosity using Lee-Gonzalez-Eakin correlation
   * @param density Gas density in kg/m³
   * @param temperature Temperature in K
   * @param molecularWeight Molecular weight in g/mol
   * @returns Gas viscosity in Pa·s
   */
  static calculateGasViscosity(
    density: number,
    temperature: number,
    molecularWeight: number
  ): number {
    const T_rankine = temperature * 1.8; // K to Rankine
    const rho_g_per_cm3 = density / 1000; // kg/m³ to g/cm³

    const K = ((9.379 + 0.01607 * molecularWeight) * Math.pow(T_rankine, 1.5)) /
              (209.2 + 19.26 * molecularWeight + T_rankine);

    const X = 3.448 + 986.4 / T_rankine + 0.01009 * molecularWeight;
    const Y = 2.447 - 0.2224 * X;

    const mu_cp = K * Math.exp(X * Math.pow(rho_g_per_cm3, Y)) / 10000; // cP
    const mu_pa_s = mu_cp / 1000; // cP to Pa·s

    return mu_pa_s;
  }

  /**
   * Calculate average temperature in a segment considering geothermal gradient
   * @param surfaceTemp Surface temperature in K
   * @param depth Depth in meters
   * @param geothermalGradient Temperature gradient in K/m (default 0.025 K/m or 25°C/km)
   * @returns Average temperature in K
   */
  static calculateTemperature(
    surfaceTemp: number,
    depth: number,
    geothermalGradient: number = 0.025
  ): number {
    return surfaceTemp + geothermalGradient * depth;
  }

  /**
   * PRIORITY 2 FIX: Calculate Joule-Thomson coefficient for natural gas
   * μ_JT = (∂T/∂P)_H (temperature change per unit pressure drop at constant enthalpy)
   * For natural gas: μ_JT ≈ 0.4 K/MPa at typical conditions
   *
   * @param temperature Temperature in K
   * @param pressure Pressure in Pa
   * @param specificGravity Gas specific gravity
   * @returns Joule-Thomson coefficient in K/Pa
   */
  static calculateJouleThomsonCoefficient(
    temperature: number,
    pressure: number,
    specificGravity: number
  ): number {
    // Simplified correlation for natural gas
    // μ_JT decreases with temperature and increases with molecular weight

    const T_celsius = temperature - 273.15;

    // Base coefficient for methane (CH4) at 15°C, 1 atm: ~0.4 K/MPa
    const mu_JT_base = 0.4e-6; // K/Pa (converted from K/MPa)

    // Temperature correction: μ_JT decreases with increasing temperature
    const temp_factor = 1.0 - (T_celsius - 15) / 300;

    // Molecular weight correction: heavier gases have larger μ_JT
    const mw_factor = specificGravity; // Relative to air

    // Pressure correction: μ_JT decreases at high pressure
    const P_MPa = pressure / 1e6;
    const pressure_factor = 1.0 / (1.0 + 0.1 * P_MPa);

    const mu_JT = mu_JT_base * temp_factor * mw_factor * pressure_factor;

    // Constrain to reasonable range
    return Math.max(0, Math.min(1e-6, mu_JT)); // 0 to 1 K/MPa
  }

  /**
   * PRIORITY 2 FIX: Calculate temperature with Joule-Thomson cooling effect
   * ΔT_JT = μ_JT * ΔP
   *
   * @param surfaceTemp Surface temperature in K
   * @param depth Depth in meters
   * @param pressureDrop Pressure drop in Pa (positive value)
   * @param pressure Current pressure in Pa
   * @param specificGravity Gas specific gravity
   * @param geothermalGradient Temperature gradient in K/m
   * @returns Temperature with JT cooling in K
   */
  static calculateTemperatureWithJT(
    surfaceTemp: number,
    depth: number,
    pressureDrop: number,
    pressure: number,
    specificGravity: number,
    geothermalGradient: number = 0.025
  ): number {
    // Geothermal heating
    const T_geothermal = surfaceTemp + geothermalGradient * depth;

    // Joule-Thomson cooling (only applies if pressure is dropping)
    const mu_JT = this.calculateJouleThomsonCoefficient(T_geothermal, pressure, specificGravity);
    const deltaT_JT = mu_JT * Math.abs(pressureDrop); // Cooling is positive pressure drop

    // Net temperature (geothermal heating - JT cooling)
    const T_final = T_geothermal - deltaT_JT;

    return T_final;
  }

  /**
   * Convert temperature from Celsius to Kelvin
   */
  static celsiusToKelvin(celsius: number): number {
    return celsius + 273.15;
  }

  /**
   * Convert temperature from Kelvin to Celsius
   */
  static kelvinToCelsius(kelvin: number): number {
    return kelvin - 273.15;
  }

  /**
   * Calculate speed of sound in gas
   * c = √(γ * Z * R * T / M)
   * @param temperature Temperature in K
   * @param compressibility Z-factor
   * @param specificGravity Specific gravity (relative to air)
   * @param gamma Specific heat ratio (default 1.3 for natural gas)
   * @returns Speed of sound in m/s
   */
  static calculateSpeedOfSound(
    temperature: number,
    compressibility: number,
    specificGravity: number,
    gamma: number = 1.3
  ): number {
    const M_air = 28.97;
    const M_gas = specificGravity * M_air;
    const R_specific = (R_UNIVERSAL * 1000) / M_gas; // J/(kg·K)

    // c = √(γ * Z * R * T / M) but simplified to c = √(γ * Z * R_specific * T)
    const c = Math.sqrt(gamma * compressibility * R_specific * temperature);
    return c;
  }

  /**
   * Calculate Mach number
   * M = V / c
   * @param velocity Flow velocity in m/s
   * @param speedOfSound Speed of sound in m/s
   * @returns Mach number (dimensionless)
   */
  static calculateMachNumber(velocity: number, speedOfSound: number): number {
    if (speedOfSound === 0) return 0;
    return velocity / speedOfSound;
  }

  /**
   * CRITICAL FIX: Calculate vapor pressure of water using Antoine equation
   * log10(P_vapor) = A - B / (C + T)
   * Valid for water from 1°C to 100°C
   * @param temperature Temperature in K
   * @returns Vapor pressure in Pa
   */
  static calculateVaporPressure(temperature: number): number {
    const T_celsius = temperature - 273.15;

    // Antoine equation coefficients for water (pressure in mmHg)
    // Valid range: 1°C to 100°C
    const A = 8.07131;
    const B = 1730.63;
    const C = 233.426;

    // Calculate vapor pressure in mmHg
    const log_P_mmHg = A - (B / (C + T_celsius));
    const P_mmHg = Math.pow(10, log_P_mmHg);

    // Convert mmHg to Pa (1 mmHg = 133.322 Pa)
    const P_vapor = P_mmHg * 133.322;

    // For temperatures below 0°C or above 100°C, use extrapolation with limits
    if (T_celsius < 0) {
      return 611; // Triple point of water (0.01°C)
    } else if (T_celsius > 100) {
      // Linear extrapolation above 100°C (rough approximation)
      const P_100C = 101325; // 1 atm at 100°C
      const slope = 3600; // Pa/°C (rough slope above 100°C)
      return P_100C + slope * (T_celsius - 100);
    }

    return P_vapor;
  }
}
