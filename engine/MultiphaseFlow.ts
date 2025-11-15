/**
 * Multiphase Flow Module
 * Handles two-phase (gas-liquid) flow calculations for injection wells
 * Uses simplified Beggs-Brill correlation for vertical flow
 */

import { PI, GRAVITY } from '../constants/physics';

export interface MultiphaseProperties {
  gasVoidFraction: number;
  liquidHoldup: number;
  flowPattern: string;
  mixtureDensity: number;
  mixtureViscosity: number;
  mixtureVelocity: number;
  // CRITICAL: Actual phase velocities (not superficial)
  actualGasVelocity?: number;
  actualLiquidVelocity?: number;
  slipVelocity?: number;
}

export class MultiphaseFlow {
  /**
   * Calculate superficial velocities for gas and liquid
   */
  static calculateSuperficialVelocities(
    gasFlowRate: number, // m³/day at standard conditions
    liquidFlowRate: number, // m³/day
    diameter: number, // m
    pressure: number, // Pa
    temperature: number, // K
    gasDensity: number, // kg/m³ at actual conditions (already corrected)
    standardPressure: number = 101325, // Pa
    standardTemp: number = 288.15, // K (15°C)
    Z: number = 1.0 // Compressibility factor at actual conditions
  ): { Vsg: number; Vsl: number } {
    const area = PI * Math.pow(diameter / 2, 2);

    // Convert flow rates to m³/s
    const Qg_std = gasFlowRate / 86400; // m³/s at standard conditions
    const Ql = liquidFlowRate / 86400; // m³/s

    // Correct gas flow rate for actual pressure, temperature, and compressibility
    // Using real gas law: (P1*V1)/(Z1*T1) = (P2*V2)/(Z2*T2)
    // At standard conditions, Z ≈ 1.0
    const Qg = Qg_std * (standardPressure / pressure) * (temperature / standardTemp) * Z;

    // Superficial velocities (velocity as if phase occupied entire cross-section)
    const Vsg = Qg / area; // Gas superficial velocity
    const Vsl = Ql / area; // Liquid superficial velocity

    return { Vsg, Vsl };
  }

  /**
   * CRITICAL FIX: Calculate actual phase velocities (not superficial)
   * These are the REAL velocities each phase travels at
   * V_gas_actual = V_sg / α (gas velocity in its own cross-section)
   * V_liquid_actual = V_sl / (1 - α) (liquid velocity in its own cross-section)
   * Slip velocity = V_gas_actual - V_liquid_actual
   */
  static calculateActualPhaseVelocities(
    Vsg: number,
    Vsl: number,
    voidFraction: number
  ): { actualGasVelocity: number; actualLiquidVelocity: number; slipVelocity: number } {
    const alpha = voidFraction;
    const liquidHoldup = 1 - alpha;

    // Prevent division by zero
    const safeAlpha = Math.max(0.01, Math.min(0.99, alpha));
    const safeLiquidHoldup = 1 - safeAlpha;

    // Actual velocities: superficial velocity divided by the fraction of pipe occupied
    const actualGasVelocity = Vsg / safeAlpha;
    const actualLiquidVelocity = Vsl / safeLiquidHoldup;

    // Slip velocity (difference between phase velocities)
    const slipVelocity = actualGasVelocity - actualLiquidVelocity;

    return { actualGasVelocity, actualLiquidVelocity, slipVelocity };
  }

  /**
   * Determine flow pattern for vertical upward flow
   * Based on Taitel et al. (1980) and Barnea (1987) criteria for vertical flow
   */
  static determineFlowPattern(
    Vsg: number,
    Vsl: number,
    diameter: number,
    angle: number = 90 // degrees from horizontal (90 = vertical)
  ): string {
    const Vm = Vsg + Vsl; // Mixture velocity

    if (Vm === 0) return 'No-Flow';

    const lambda = Vsl / Vm; // Input liquid fraction

    // Vertical upward flow pattern transitions
    // Based on dimensionless velocities

    // Bubble flow: Low gas velocity, high liquid fraction
    // Transition occurs around Vsg ≈ 0.3-0.5 m/s for typical conditions
    if (Vsg < 0.5 && lambda > 0.7) {
      return 'Bubble';
    }

    // Slug/Churn flow: Intermediate gas velocities
    // Typical for 0.5 < Vsg < 5 m/s and moderate liquid fractions
    if (Vsg >= 0.5 && Vsg < 5 && lambda > 0.2) {
      return 'Slug';
    }

    // Churn flow: Transition between slug and annular
    if (Vsg >= 5 && Vsg < 10 && lambda > 0.15) {
      return 'Churn';
    }

    // Annular flow: High gas velocity, liquid film on walls
    // Occurs at Vsg > 5-10 m/s with lower liquid fractions
    if (Vsg >= 10 && lambda > 0.05 && lambda < 0.5) {
      return 'Annular';
    }

    // Annular-Mist: Very high gas velocity
    if (Vsg >= 15 && lambda > 0.02) {
      return 'Annular-Mist';
    }

    // Mist flow: Dominated by gas, liquid as droplets
    if (lambda < 0.02) {
      return 'Mist';
    }

    // Wispy-Annular: High gas with some liquid entrainment
    if (Vsg > 10 && lambda >= 0.5) {
      return 'Wispy-Annular';
    }

    // Default for intermediate/uncertain cases
    return 'Transition';
  }

  /**
   * PRIORITY 2 FIX: Calculate drift velocity using Harmathy correlation
   * V_d = 1.53 * √(g * σ * Δρ / ρ_L²)
   * This is the bubble rise velocity in stagnant liquid
   *
   * @param liquidDensity Liquid density in kg/m³
   * @param gasDensity Gas density in kg/m³
   * @param surfaceTension Surface tension in N/m (default 0.072 for water-air at 20°C)
   * @param gravity Gravitational acceleration in m/s²
   * @returns Drift velocity in m/s
   */
  static calculateDriftVelocity(
    liquidDensity: number,
    gasDensity: number,
    surfaceTension: number = 0.072,
    gravity: number = 9.81
  ): number {
    const deltaRho = liquidDensity - gasDensity;

    // Harmathy correlation for bubble rise velocity
    // V_d = 1.53 * √(g * σ * Δρ / ρ_L²)
    const Vd = 1.53 * Math.sqrt((gravity * surfaceTension * deltaRho) / Math.pow(liquidDensity, 2));

    // Typical range: 0.2-0.3 m/s for water-air
    // Constrain to reasonable physical range
    return Math.max(0.1, Math.min(0.5, Vd));
  }

  /**
   * Calculate liquid holdup for vertical flow
   * Uses drift-flux model with flow pattern dependent correlations
   */
  static calculateLiquidHoldup(
    Vsg: number,
    Vsl: number,
    flowPattern: string,
    liquidDensity: number,
    gasDensity: number,
    surfaceTension: number = 0.072
  ): number {
    const Vm = Vsg + Vsl;

    if (Vm === 0) return 0.5;

    const lambda = Vsl / Vm; // Input liquid fraction (no-slip holdup)

    // Drift flux parameters
    const deltaRho = liquidDensity - gasDensity;
    const C0 = 1.2; // Distribution parameter (typical for vertical flow)

    // Calculate drift velocity (Vd) based on flow pattern
    let Vd: number; // Drift velocity

    let HL: number;

    switch (flowPattern) {
      case 'Bubble':
        // PRIORITY 2 FIX: Use proper Harmathy correlation
        Vd = this.calculateDriftVelocity(liquidDensity, gasDensity, surfaceTension);
        // Drift flux: HL = lambda / (C0 + Vd/Vm)
        HL = lambda / (C0 + Vd / Vm);
        HL = Math.min(0.98, Math.max(lambda, HL));
        break;

      case 'Slug':
      case 'Churn':
        // PRIORITY 2 FIX: Slug flow has larger Taylor bubbles, higher drift velocity
        Vd = this.calculateDriftVelocity(liquidDensity, gasDensity, surfaceTension) * 1.4; // ~35% higher for Taylor bubbles
        HL = lambda / (C0 + Vd / Vm);
        // In slug flow, holdup is typically higher than lambda
        HL = Math.max(lambda * 1.1, HL);
        break;

      case 'Annular':
      case 'Annular-Mist':
      case 'Wispy-Annular':
        // Annular flow: Liquid as film on walls
        // Holdup is significantly less than lambda due to high slip
        // Use correlation: HL ≈ lambda^0.5 for high gas velocities
        if (Vsg > 10) {
          HL = Math.pow(lambda, 0.6); // Increased slip at high Vsg
        } else {
          HL = Math.pow(lambda, 0.7);
        }
        // Minimum film thickness consideration
        HL = Math.max(0.05, HL);
        break;

      case 'Mist':
        // Mist flow: Liquid as droplets entrained in gas
        // Very low holdup
        HL = lambda * 0.2; // High slip, droplets travel much slower than gas
        HL = Math.max(0.01, Math.min(0.15, HL));
        break;

      default:
        // Transition or uncertain: Use no-slip assumption
        HL = lambda;
    }

    // Ensure physical bounds
    return Math.max(0.01, Math.min(0.99, HL));
  }

  /**
   * Calculate gas void fraction (1 - liquid holdup)
   */
  static calculateVoidFraction(liquidHoldup: number): number {
    return 1 - liquidHoldup;
  }

  /**
   * PRIORITY 2 FIX: Calculate Froude number
   * Fr = V / √(g * D)
   * Indicates ratio of inertial to gravitational forces
   * Fr < 1: Gravity-dominated (subcritical flow)
   * Fr = 1: Critical flow
   * Fr > 1: Inertia-dominated (supercritical flow)
   *
   * @param velocity Flow velocity in m/s
   * @param diameter Pipe diameter in m
   * @param gravity Gravitational acceleration in m/s²
   * @returns Froude number (dimensionless)
   */
  static calculateFroudeNumber(
    velocity: number,
    diameter: number,
    gravity: number = 9.81
  ): number {
    return velocity / Math.sqrt(gravity * diameter);
  }

  /**
   * PRIORITY 2 FIX: Calculate Weber number
   * We = ρ * V² * D / σ
   * Indicates ratio of inertial to surface tension forces
   * We < 1: Surface tension dominates (spherical bubbles/droplets)
   * We > 1: Inertia dominates (deformation, breakup)
   * Critical Weber numbers:
   * - We ≈ 10: Onset of bubble deformation
   * - We ≈ 100: Onset of droplet entrainment in annular flow
   *
   * @param velocity Flow velocity in m/s
   * @param diameter Characteristic length (pipe diameter) in m
   * @param density Fluid density in kg/m³
   * @param surfaceTension Surface tension in N/m
   * @returns Weber number (dimensionless)
   */
  static calculateWeberNumber(
    velocity: number,
    diameter: number,
    density: number,
    surfaceTension: number
  ): number {
    return (density * Math.pow(velocity, 2) * diameter) / surfaceTension;
  }

  /**
   * Calculate mixture density
   */
  static calculateMixtureDensity(
    liquidHoldup: number,
    liquidDensity: number,
    gasDensity: number
  ): number {
    return liquidHoldup * liquidDensity + (1 - liquidHoldup) * gasDensity;
  }

  /**
   * Calculate mixture viscosity using simple mixing rule
   */
  static calculateMixtureViscosity(
    liquidHoldup: number,
    liquidViscosity: number,
    gasViscosity: number
  ): number {
    // Simple volume-weighted average
    return liquidHoldup * liquidViscosity + (1 - liquidHoldup) * gasViscosity;
  }

  /**
   * Calculate two-phase friction factor
   * Uses Lockhart-Martinelli approach with modifications for vertical flow
   */
  static calculateTwoPhasefrictionFactor(
    Re: number,
    relativeRoughness: number,
    liquidHoldup: number,
    Vsg: number,
    Vsl: number
  ): number {
    const Vm = Vsg + Vsl;
    if (Vm === 0) return 0.02;

    // Calculate single-phase friction factor (base) for mixture
    let f_base: number;

    if (Re < 2300) {
      f_base = 64 / Re;
    } else {
      // Swamee-Jain for turbulent flow
      const effectiveRoughness = Math.max(relativeRoughness, 1e-10);
      const logTerm = Math.log10((effectiveRoughness / 3.7) + (5.74 / Math.pow(Re, 0.9)));
      f_base = 0.25 / Math.pow(logTerm, 2);
    }

    const lambda = Vsl / Vm; // No-slip liquid fraction

    // Two-phase friction multiplier (φ²_L) based on Lockhart-Martinelli
    // X² = (dP/dz)_L / (dP/dz)_G (pressure gradient ratio)

    // For vertical flow, use simplified correlation
    // φ²_L ≈ 1 + C/X + 1/X²
    // where C depends on flow regime (typically 5-20)

    let phi_squared: number;

    if (lambda < 0.1) {
      // Gas-dominated: Low multiplier
      phi_squared = 1.2 + 0.3 * lambda / (1 - lambda);
    } else if (lambda > 0.9) {
      // Liquid-dominated: Slight increase
      phi_squared = 1.5 + 2.0 * (1 - lambda) / lambda;
    } else {
      // Intermediate: Maximum friction occurs around 50-50
      // Use correlation based on holdup and slip
      const S = liquidHoldup / (lambda + 1e-10); // Slip ratio
      phi_squared = 1 + (1 - S) * 15 * lambda * (1 - lambda);
    }

    // Apply two-phase multiplier
    const f_two_phase = f_base * phi_squared;

    // Constrain to reasonable range (1x to 20x single-phase)
    return Math.max(f_base, Math.min(20 * f_base, f_two_phase));
  }

  /**
   * Complete multiphase flow properties calculation
   */
  static calculateMultiphaseProperties(
    gasFlowRate: number,
    liquidFlowRate: number,
    diameter: number,
    pressure: number,
    temperature: number,
    liquidDensity: number,
    gasDensity: number,
    liquidViscosity: number,
    gasViscosity: number,
    Z: number = 1.0
  ): MultiphaseProperties {
    // Calculate superficial velocities
    const { Vsg, Vsl } = this.calculateSuperficialVelocities(
      gasFlowRate,
      liquidFlowRate,
      diameter,
      pressure,
      temperature,
      gasDensity,
      101325,
      288.15,
      Z
    );

    // Determine flow pattern
    const flowPattern = this.determineFlowPattern(Vsg, Vsl, diameter);

    // PRIORITY 2 FIX: Surface tension for water-gas interface at typical conditions
    // Water-air: 0.072 N/m at 20°C, decreases with temperature
    // For simplicity, use constant value (could be temperature-dependent in future)
    const surfaceTension = 0.072; // N/m

    // Calculate liquid holdup with surface tension
    const liquidHoldup = this.calculateLiquidHoldup(Vsg, Vsl, flowPattern, liquidDensity, gasDensity, surfaceTension);

    // Calculate gas void fraction
    const gasVoidFraction = this.calculateVoidFraction(liquidHoldup);

    // Calculate mixture properties
    const mixtureDensity = this.calculateMixtureDensity(liquidHoldup, liquidDensity, gasDensity);
    const mixtureViscosity = this.calculateMixtureViscosity(liquidHoldup, liquidViscosity, gasViscosity);
    const mixtureVelocity = Vsg + Vsl;

    // CRITICAL FIX: Calculate actual phase velocities (not superficial)
    const { actualGasVelocity, actualLiquidVelocity, slipVelocity } =
      this.calculateActualPhaseVelocities(Vsg, Vsl, gasVoidFraction);

    return {
      gasVoidFraction,
      liquidHoldup,
      flowPattern,
      mixtureDensity,
      mixtureViscosity,
      mixtureVelocity,
      actualGasVelocity,
      actualLiquidVelocity,
      slipVelocity
    };
  }
}
