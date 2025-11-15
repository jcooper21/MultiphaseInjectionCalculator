import { CalculationResults, SegmentResult, CalculationParams } from '../types';
import {
  GRAVITY, PI, LAMINAR_FLOW_LIMIT, TURBULENT_FLOW_START, SECONDS_PER_DAY, ENTRY_LOSS_COEFFICIENT, DEFAULT_OPEN_HOLE_ROUGHNESS
} from '../constants/physics';
import { GasProperties } from '../engine/GasProperties';
import { MultiphaseFlow } from '../engine/MultiphaseFlow';

export class CalculatorService {
  /**
   * CRITICAL FIX: Comprehensive input validation for professional use
   * Validates all input parameters for physical reasonableness
   */
  private static validateInputs(params: CalculationParams): string[] {
    const errors: string[] = [];

    // Flow rate validation
    if (params.flowRate < 0) {
      errors.push('Flow rate cannot be negative');
    }
    if (params.flowRate > 1000000) {
      errors.push('Flow rate unreasonably high (> 1,000,000 m³/day). Check units.');
    }

    // Pressure validation
    if (params.injectionPressure < 0) {
      errors.push('Injection pressure cannot be negative');
    }
    if (params.injectionPressure > 200000) {
      errors.push('Injection pressure > 200 MPa (200,000 kPa) is unrealistic. Check units.');
    }
    if (params.bottomholePressure < 0) {
      errors.push('Bottomhole pressure cannot be negative');
    }
    if (params.bottomholePressure > 200000) {
      errors.push('Bottomhole pressure > 200 MPa is unrealistic. Check units.');
    }

    // Density validation (only for liquid and multiphase)
    if (params.injectionType === 'liquid' || params.injectionType === 'multiphase') {
      if (params.fluidDensity <= 0) {
        errors.push('Fluid density must be positive');
      }
      if (params.fluidDensity < 100 || params.fluidDensity > 2500) {
        errors.push(`Fluid density ${params.fluidDensity} kg/m³ is unusual. Typical: 700-1200 kg/m³`);
      }
    }

    // Viscosity validation (only for liquid and multiphase)
    if (params.injectionType === 'liquid' || params.injectionType === 'multiphase') {
      if (params.fluidViscosity <= 0) {
        errors.push('Fluid viscosity must be positive');
      }
      if (params.fluidViscosity > 1) {
        errors.push(`Viscosity ${params.fluidViscosity} Pa·s is very high. Check units (should be Pa·s, not cP)`);
      }
    }

    // Well depth validation
    if (params.wellDepth <= 0) {
      errors.push('Well depth must be positive');
    }
    if (params.wellDepth > 15000) {
      errors.push('Well depth > 15 km is unrealistic');
    }

    // Segment validation
    if (!params.segments || params.segments.length === 0) {
      errors.push('At least one segment is required');
    } else {
      params.segments.forEach((seg, idx) => {
        if (seg.diameter <= 0) {
          errors.push(`Segment ${idx + 1}: diameter must be positive`);
        }
        if (seg.diameter < 10 || seg.diameter > 1000) {
          errors.push(`Segment ${idx + 1}: diameter ${seg.diameter} mm is unusual. Typical: 50-300 mm`);
        }
        if (seg.length <= 0) {
          errors.push(`Segment ${idx + 1}: length must be positive`);
        }
        if (seg.length > 10000) {
          errors.push(`Segment ${idx + 1}: length > 10 km is unusual for a single segment`);
        }
        if (seg.roughness < 0) {
          errors.push(`Segment ${idx + 1}: roughness cannot be negative`);
        }
        if (seg.roughness > 10) {
          errors.push(`Segment ${idx + 1}: roughness > 10 mm is unrealistic`);
        }
      });
    }

    // Gas-specific validation
    if (params.injectionType === 'gas' || params.injectionType === 'multiphase') {
      if (params.gasSpecificGravity !== undefined) {
        if (params.gasSpecificGravity <= 0) {
          errors.push('Gas specific gravity must be positive');
        }
        if (params.gasSpecificGravity < 0.5 || params.gasSpecificGravity > 2.0) {
          errors.push(`Gas specific gravity ${params.gasSpecificGravity} is unusual. Typical: 0.55-0.75`);
        }
      }
      if (params.temperature !== undefined) {
        if (params.temperature <= 0) {
          errors.push('Temperature must be positive (in Kelvin)');
        }
        if (params.temperature < 200 || params.temperature > 500) {
          errors.push(`Temperature ${params.temperature} K is unusual. Typical: 270-350 K`);
        }
      }
    }

    // Multiphase-specific validation
    if (params.injectionType === 'multiphase') {
      if (params.gasFlowRate !== undefined && params.gasFlowRate <= 0) {
        errors.push('Gas flow rate must be positive for multiphase flow');
      }
      if (params.liquidFlowRate !== undefined && params.liquidFlowRate <= 0) {
        errors.push('Liquid flow rate must be positive for multiphase flow');
      }
    }

    return errors;
  }

  /**
   * ROBUSTNESS FIX: Validate critical calculation values for NaN/Infinity
   * Throws error if invalid values detected
   */
  private static validateCalculationValue(
    value: number,
    name: string,
    segmentNumber: number,
    minValue: number = -Infinity,
    maxValue: number = Infinity
  ): void {
    if (!isFinite(value) || isNaN(value)) {
      throw new Error(
        `Invalid ${name} calculated in segment ${segmentNumber}: ${value}. ` +
        `This indicates a numerical error in the calculations. Please check input parameters.`
      );
    }
    if (value < minValue || value > maxValue) {
      throw new Error(
        `${name} out of physically reasonable range in segment ${segmentNumber}: ${value}. ` +
        `Expected range: ${minValue} to ${maxValue}`
      );
    }
  }

  static calculateReynolds(velocity: number, diameter: number, density: number, viscosity: number): number {
    if (viscosity === 0 || diameter === 0) return 0;
    return (density * velocity * diameter) / viscosity;
  }

  private static calculateTurbulentFriction(Re: number, relativeRoughness: number): number {
    const effectiveRoughness = Math.max(relativeRoughness, 1e-10);
    // Swamee-Jain equation - explicit and accurate for turbulent flow
    const logTerm = Math.log10((effectiveRoughness / 3.7) + (5.74 / Math.pow(Re, 0.9)));
    const f = 0.25 / Math.pow(logTerm, 2);
    return f;
  }
  
  static calculateFrictionFactor(Re: number, relativeRoughness: number): number {
    if (Re <= 0) return 0;
    if (Re < LAMINAR_FLOW_LIMIT) return 64 / Re;
    if (Re >= LAMINAR_FLOW_LIMIT && Re < TURBULENT_FLOW_START) {
      // Linear interpolation for transitional flow
      const laminarF = 64 / LAMINAR_FLOW_LIMIT;
      const turbulentF = this.calculateTurbulentFriction(TURBULENT_FLOW_START, relativeRoughness);
      const fraction = (Re - LAMINAR_FLOW_LIMIT) / (TURBULENT_FLOW_START - LAMINAR_FLOW_LIMIT);
      return laminarF + fraction * (turbulentF - laminarF);
    }
    return this.calculateTurbulentFriction(Re, relativeRoughness);
  }
  
  public static calculatePressureDrop(params: CalculationParams): CalculationResults {
    // CRITICAL FIX: Validate all inputs before calculation
    const validationErrors = this.validateInputs(params);
    if (validationErrors.length > 0) {
      throw new Error(`Input validation failed:\n${validationErrors.join('\n')}`);
    }

    const { injectionType } = params;

    switch (injectionType) {
      case 'gas':
        return this.calculateGasInjection(params);
      case 'multiphase':
        return this.calculateMultiphaseInjection(params);
      case 'liquid':
      default:
        return this.calculateLiquidInjection(params);
    }
  }

  private static calculateLiquidInjection(params: CalculationParams): CalculationResults {
    const {
      segments, flowRate, injectionPressure, bottomholePressure,
      fluidDensity, fluidViscosity, wellDepth, openHoleDiameter
    } = params;

    const Q = flowRate / SECONDS_PER_DAY;
    let currentPressure = injectionPressure * 1000; // Pa
    
    let totalFrictionLoss = 0;
    let totalPressureDrop = 0;
    const segmentResults: SegmentResult[] = [];
    const warnings: string[] = [];
    let cumulativeDepth = 0;
    let maxVelocity = 0;
    let maxVelocitySegment = 0;
    const frictionLosses: {loss: number, regime: 'Laminar' | 'Transitional' | 'Turbulent'}[] = [];

    const allSegments = [...segments];
    const totalSegmentLength = segments.reduce((sum, seg) => sum + (seg.length || 0), 0);
    const openHoleLength = Math.max(0, wellDepth - totalSegmentLength);
    
    if (openHoleLength > 0.1) {
      if(openHoleDiameter <= 0) throw new Error("Open hole diameter must be a positive value.");
      allSegments.push({
        id: -1, // special id for open hole
        diameter: openHoleDiameter,
        length: openHoleLength,
        roughness: DEFAULT_OPEN_HOLE_ROUGHNESS,
      });
    }

    for (let index = 0; index < allSegments.length; index++) {
      const segment = allSegments[index];
      const D = segment.diameter / 1000;
      const L = segment.length;
      
      if (D <= 0) throw new Error(`Invalid diameter for segment ${index + 1}. Diameter must be greater than 0.`);
      
      const A = PI * Math.pow(D / 2, 2);
      if (A <= 0) throw new Error(`Invalid segment diameter for segment ${index + 1}; area cannot be zero or negative.`);

      const V = Q / A;

      if (V > maxVelocity) {
        maxVelocity = V;
        maxVelocitySegment = index + 1;
      }

      const Re = this.calculateReynolds(V, D, fluidDensity, fluidViscosity);
      const relativeRoughness = segment.roughness / (D * 1000);
      const f = this.calculateFrictionFactor(Re, relativeRoughness);
      
      const hf = V === 0 ? 0 : f * (L / D) * (Math.pow(V, 2) / (2 * GRAVITY));
      const frictionPressureLoss = fluidDensity * GRAVITY * hf;
      const hydrostaticGain = fluidDensity * GRAVITY * L;

      let minorLoss = 0;
      // Entry loss for the very first segment
      if (index === 0) {
        minorLoss += ENTRY_LOSS_COEFFICIENT * fluidDensity * Math.pow(V, 2) / 2;
      }
      
      if (index > 0) {
        const prevD = allSegments[index - 1].diameter / 1000;
        const prevA = PI * Math.pow(prevD / 2, 2);

        if (A > 0 && prevA > 0 && Q > 0) {
          const prevV = Q / prevA;

          if (A < prevA) { // Contraction
            const areaRatio = A / prevA;
            const Cc = 0.62 + 0.38 * Math.pow(areaRatio, 3);
            const Kc = Math.pow((1 / Cc) - 1, 2);
            minorLoss += Kc * fluidDensity * Math.pow(V, 2) / 2;
          } else if (A > prevA) { // Expansion
            const Ke = Math.pow(1 - (prevA / A), 2);
            minorLoss += Ke * fluidDensity * Math.pow(prevV, 2) / 2;
          }
        }
      }

      // CRITICAL FIX: Kinetic energy (acceleration) term
      // ΔP_acceleration = ρ * (V2² - V1²) / 2
      // This accounts for pressure drop needed to accelerate the fluid
      let accelerationPressureLoss = 0;
      if (index > 0) {
        const prevD = allSegments[index - 1].diameter / 1000;
        const prevA = PI * Math.pow(prevD / 2, 2);
        const prevV = Q / prevA;
        accelerationPressureLoss = fluidDensity * (Math.pow(V, 2) - Math.pow(prevV, 2)) / 2;
      }

      const inletPressure = currentPressure;
      const netPressureChange = hydrostaticGain - frictionPressureLoss - minorLoss - accelerationPressureLoss;
      currentPressure += netPressureChange;

      // CRITICAL FIX: Proper cavitation check using vapor pressure
      // Cavitation occurs when P < P_vapor(T), NOT when P < 0
      const T_estimate = 288.15 + 0.025 * cumulativeDepth; // Approximate temperature
      const P_vapor = GasProperties.calculateVaporPressure(T_estimate);
      const hasCavitationWarning = warnings.some(w => w.startsWith('Cavitation'));

      if (currentPressure < P_vapor && !hasCavitationWarning) {
        warnings.push(`🚨 Cavitation risk: Pressure ${(currentPressure/1000).toFixed(1)} kPa below vapor pressure ${(P_vapor/1000).toFixed(1)} kPa at ${T_estimate.toFixed(1)}K in segment ${index + 1}. CRITICAL: Liquid will vaporize causing flow instability and pump damage. Increase injection pressure.`);
      } else if (currentPressure < 0 && !hasCavitationWarning) {
        warnings.push(`Cavitation risk: Negative absolute pressure calculated in segment ${index + 1}. The results are physically unrealistic. This indicates the injection pressure is too low for the given flow rate, or the flow rate is too high.`);
      }

      const depthFrom = cumulativeDepth;
      cumulativeDepth += L;

      const flowRegime = Re < LAMINAR_FLOW_LIMIT ? 'Laminar' : Re < TURBULENT_FLOW_START ? 'Transitional' : 'Turbulent';
      frictionLosses.push({ loss: frictionPressureLoss, regime: flowRegime });

      if(segment.id !== -1) {
        // ROBUSTNESS FIX: Validate critical values before adding to results
        this.validateCalculationValue(V, 'velocity', index + 1, 0, 100);
        this.validateCalculationValue(currentPressure, 'outlet pressure', index + 1, 0, 300e6);
        this.validateCalculationValue(Re, 'Reynolds number', index + 1, 0, 1e8);

        segmentResults.push({
          segmentNumber: index + 1,
          diameter: segment.diameter,
          length: L,
          depthFrom,
          depthTo: cumulativeDepth,
          velocity: V,
          reynoldsNumber: Re,
          flowRegime,
          frictionFactor: f,
          frictionLoss: frictionPressureLoss / 1000,
          hydrostaticGain: hydrostaticGain / 1000,
          minorLoss: minorLoss / 1000,
          netPressureChange: netPressureChange / 1000,
          inletPressure: inletPressure / 1000,
          outletPressure: currentPressure / 1000
        });
      }
      
      totalFrictionLoss += frictionPressureLoss;
      totalPressureDrop += frictionPressureLoss + minorLoss;
    }
    
    let dominantRegime: 'Laminar' | 'Transitional' | 'Turbulent' = 'Turbulent';
    if (frictionLosses.length > 0) {
      const maxFrictionSegment = frictionLosses.reduce((max, current) => current.loss > max.loss ? current : max);
      if (maxFrictionSegment.regime === 'Laminar') {
        dominantRegime = 'Laminar';
      }
    }
    const flowExponent = dominantRegime === 'Laminar' ? 1.0 : 2.0; 

    const totalHydrostatic = fluidDensity * GRAVITY * wellDepth;
    const availablePressure = (injectionPressure * 1000) + totalHydrostatic - (bottomholePressure * 1000);

    let maxFlowRate: number;
    if (availablePressure <= 0) {
      maxFlowRate = 0;
    } else if (totalPressureDrop <= 0 || Q === 0) {
      maxFlowRate = Infinity;
    } else {
      maxFlowRate = flowRate * Math.pow(availablePressure / totalPressureDrop, 1 / flowExponent);
    }

    return {
      segments: segmentResults,
      totalFrictionLoss: totalFrictionLoss / 1000,
      totalPressureDrop: totalPressureDrop / 1000,
      bottomPressure: currentPressure / 1000,
      maxFlowRate,
      actualFlowRate: flowRate,
      maxSegmentVelocity: maxVelocity,
      maxVelocitySegment: maxVelocitySegment,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private static calculateGasInjection(params: CalculationParams): CalculationResults {
    const {
      segments, flowRate, injectionPressure, bottomholePressure,
      wellDepth, openHoleDiameter, gasSpecificGravity = 0.65, temperature = 288.15,
      geothermalGradient = 0.025 // FIXED: Configurable, default 25°C/km
    } = params;

    if (!gasSpecificGravity) {
      throw new Error('Gas specific gravity is required for gas injection calculations');
    }

    const Q_std = flowRate / SECONDS_PER_DAY; // m³/s at standard conditions
    let currentPressure = injectionPressure * 1000; // Pa
    const surfaceTemp = temperature; // K

    let totalFrictionLoss = 0;
    let totalPressureDrop = 0;
    const segmentResults: SegmentResult[] = [];
    const warnings: string[] = [];
    let cumulativeDepth = 0;
    let maxVelocity = 0;
    let maxVelocitySegment = 0;
    let sumDensity = 0;
    let sumZ = 0;
    let segmentCount = 0;
    let cumulativePressureDrop = 0; // Track total pressure drop for JT cooling
    let previousPressure = currentPressure; // Track previous segment pressure for acceleration term
    let previousTemperature = surfaceTemp; // Track previous segment temperature

    const allSegments = [...segments];
    const totalSegmentLength = segments.reduce((sum, seg) => sum + (seg.length || 0), 0);
    const openHoleLength = Math.max(0, wellDepth - totalSegmentLength);

    if (openHoleLength > 0.1) {
      if (openHoleDiameter <= 0) throw new Error("Open hole diameter must be a positive value.");
      allSegments.push({
        id: -1,
        diameter: openHoleDiameter,
        length: openHoleLength,
        roughness: DEFAULT_OPEN_HOLE_ROUGHNESS,
      });
    }

    for (let index = 0; index < allSegments.length; index++) {
      const segment = allSegments[index];
      const D = segment.diameter / 1000; // m
      const L = segment.length; // m

      if (D <= 0) throw new Error(`Invalid diameter for segment ${index + 1}. Diameter must be greater than 0.`);

      const depthMidpoint = cumulativeDepth + L / 2;

      // PRIORITY 2 FIX: Calculate temperature with Joule-Thomson cooling
      // Temperature considers both geothermal gradient and JT cooling from pressure drop
      const T_segment = GasProperties.calculateTemperatureWithJT(
        surfaceTemp,
        depthMidpoint,
        cumulativePressureDrop,
        currentPressure,
        gasSpecificGravity,
        geothermalGradient // FIXED: Use configurable gradient
      );

      // Calculate gas properties at segment conditions
      const Z = GasProperties.calculateCompressibility(currentPressure, T_segment, gasSpecificGravity);
      const rho_gas = GasProperties.calculateGasDensity(currentPressure, T_segment, gasSpecificGravity, Z);
      const M_gas = gasSpecificGravity * 28.97;
      const mu_gas = GasProperties.calculateGasViscosity(rho_gas, T_segment, M_gas);

      sumDensity += rho_gas;
      sumZ += Z;
      segmentCount++;

      // Calculate actual volumetric flow rate at segment conditions
      const Q_actual = Q_std * (101325 / currentPressure) * (T_segment / 288.15) * Z;
      const A = PI * Math.pow(D / 2, 2);
      const V = Q_actual / A;

      if (V > maxVelocity) {
        maxVelocity = V;
        maxVelocitySegment = index + 1;
      }

      // CRITICAL FIX: Mach number check for gas compressibility validity
      const speedOfSound = GasProperties.calculateSpeedOfSound(T_segment, Z, gasSpecificGravity);
      const machNumber = GasProperties.calculateMachNumber(V, speedOfSound);

      // Check for compressibility effects
      if (machNumber > 0.3 && machNumber <= 0.8) {
        const hasMachWarning = warnings.some(w => w.includes('Mach number'));
        if (!hasMachWarning) {
          warnings.push(`⚠️ Compressibility Warning: Mach number ${machNumber.toFixed(3)} in segment ${index + 1}. Results may have ±5-10% error at M > 0.3. Consider using smaller diameter or lower flow rate.`);
        }
      } else if (machNumber > 0.8) {
        const hasMachError = warnings.some(w => w.includes('CRITICAL'));
        if (!hasMachError) {
          warnings.push(`🚨 CRITICAL: Mach number ${machNumber.toFixed(3)} in segment ${index + 1} approaching sonic conditions (M > 0.8). Results are INVALID. Reduce flow rate or increase diameter immediately.`);
        }
      }

      const Re = this.calculateReynolds(V, D, rho_gas, mu_gas);
      const relativeRoughness = segment.roughness / (D * 1000);
      const f = this.calculateFrictionFactor(Re, relativeRoughness);

      // Friction pressure loss
      const hf = V === 0 ? 0 : f * (L / D) * (Math.pow(V, 2) / (2 * GRAVITY));
      const frictionPressureLoss = rho_gas * GRAVITY * hf;

      // Hydrostatic pressure change (negative for gas going down - gas is lighter)
      const hydrostaticChange = rho_gas * GRAVITY * L;

      // Minor losses
      let minorLoss = 0;
      if (index === 0) {
        minorLoss += ENTRY_LOSS_COEFFICIENT * rho_gas * Math.pow(V, 2) / 2;
      }

      if (index > 0) {
        const prevD = allSegments[index - 1].diameter / 1000;
        const prevA = PI * Math.pow(prevD / 2, 2);

        if (A > 0 && prevA > 0 && Q_actual > 0) {
          const prevV = Q_actual / prevA;

          if (A < prevA) {
            const areaRatio = A / prevA;
            const Cc = 0.62 + 0.38 * Math.pow(areaRatio, 3);
            const Kc = Math.pow((1 / Cc) - 1, 2);
            minorLoss += Kc * rho_gas * Math.pow(V, 2) / 2;
          } else if (A > prevA) {
            const Ke = Math.pow(1 - (prevA / A), 2);
            minorLoss += Ke * rho_gas * Math.pow(prevV, 2) / 2;
          }
        }
      }

      // CRITICAL FIX: Kinetic energy (acceleration) term for GAS
      // ΔP_acceleration = ρ * (V2² - V1²) / 2
      // VERY IMPORTANT for gas: velocity changes dramatically due to expansion as P drops
      let accelerationPressureLoss = 0;
      if (index > 0) {
        const prevD = allSegments[index - 1].diameter / 1000;
        const prevA = PI * Math.pow(prevD / 2, 2);
        // FIXED: Calculate actual Q at previous segment's P and T conditions
        // Gas expands as pressure drops, so Q_actual is different at each segment
        const prevZ = GasProperties.calculateCompressibility(previousPressure, previousTemperature, gasSpecificGravity);
        const prevQ_actual = Q_std * (101325 / previousPressure) * (previousTemperature / 288.15) * prevZ;
        const prevV = prevQ_actual / prevA;
        // Use average density for acceleration term
        const prevRho = GasProperties.calculateGasDensity(previousPressure, previousTemperature, gasSpecificGravity, prevZ);
        const avgRho = (rho_gas + prevRho) / 2;
        accelerationPressureLoss = avgRho * (Math.pow(V, 2) - Math.pow(prevV, 2)) / 2;
      }

      const inletPressure = currentPressure;
      const netPressureChange = hydrostaticChange - frictionPressureLoss - minorLoss - accelerationPressureLoss;
      currentPressure += netPressureChange;

      // PRIORITY 2 FIX: Track cumulative pressure drop for JT cooling
      // Only count friction and minor losses (not hydrostatic)
      cumulativePressureDrop += (frictionPressureLoss + minorLoss + accelerationPressureLoss);

      // CRITICAL FIX: Check for negative pressure (physically impossible)
      if (currentPressure < 0) {
        warnings.push(`🚨 CRITICAL: Negative pressure ${(currentPressure/1000).toFixed(1)} kPa in segment ${index + 1}. Results are INVALID. Increase injection pressure or reduce flow rate.`);
      }

      const depthFrom = cumulativeDepth;
      cumulativeDepth += L;

      const flowRegime = Re < LAMINAR_FLOW_LIMIT ? 'Laminar' : Re < TURBULENT_FLOW_START ? 'Transitional' : 'Turbulent';

      if (segment.id !== -1) {
        // ROBUSTNESS FIX: Validate critical values before adding to results
        this.validateCalculationValue(V, 'velocity', index + 1, 0, 500);
        this.validateCalculationValue(currentPressure, 'outlet pressure', index + 1, 0, 300e6);
        this.validateCalculationValue(rho_gas, 'gas density', index + 1, 0.1, 500);
        this.validateCalculationValue(Z, 'Z-factor', index + 1, 0.2, 1.5);
        this.validateCalculationValue(T_segment, 'temperature', index + 1, 200, 600);

        segmentResults.push({
          segmentNumber: index + 1,
          diameter: segment.diameter,
          length: L,
          depthFrom,
          depthTo: cumulativeDepth,
          velocity: V,
          reynoldsNumber: Re,
          flowRegime,
          frictionFactor: f,
          frictionLoss: frictionPressureLoss / 1000,
          hydrostaticGain: hydrostaticChange / 1000,
          minorLoss: minorLoss / 1000,
          netPressureChange: netPressureChange / 1000,
          inletPressure: inletPressure / 1000,
          outletPressure: currentPressure / 1000,
          density: rho_gas,
          temperature: T_segment,
          compressibility: Z
        });
      }

      totalFrictionLoss += frictionPressureLoss;
      totalPressureDrop += frictionPressureLoss + minorLoss;

      // Update previous segment conditions for next iteration
      previousPressure = currentPressure;
      previousTemperature = T_segment;
    }

    const avgDensity = segmentCount > 0 ? sumDensity / segmentCount : 0;
    const avgZ = segmentCount > 0 ? sumZ / segmentCount : 1;

    // Simplified max flow rate calculation for gas
    const totalHydrostatic = avgDensity * GRAVITY * wellDepth;
    const availablePressure = (injectionPressure * 1000) + totalHydrostatic - (bottomholePressure * 1000);

    let maxFlowRate: number;
    if (availablePressure <= 0) {
      maxFlowRate = 0;
    } else if (totalPressureDrop <= 0) {
      maxFlowRate = Infinity;
    } else {
      maxFlowRate = flowRate * Math.sqrt(availablePressure / totalPressureDrop);
    }

    return {
      segments: segmentResults,
      totalFrictionLoss: totalFrictionLoss / 1000,
      totalPressureDrop: totalPressureDrop / 1000,
      bottomPressure: currentPressure / 1000,
      maxFlowRate,
      actualFlowRate: flowRate,
      maxSegmentVelocity: maxVelocity,
      maxVelocitySegment: maxVelocitySegment,
      warnings: warnings.length > 0 ? warnings : undefined,
      averageGasDensity: avgDensity,
      averageCompressibility: avgZ
    };
  }

  private static calculateMultiphaseInjection(params: CalculationParams): CalculationResults {
    const {
      segments, injectionPressure, bottomholePressure, wellDepth, openHoleDiameter,
      gasFlowRate = 0, liquidFlowRate = 0, fluidDensity = 1000, fluidViscosity = 0.001,
      gasSpecificGravity = 0.65, temperature = 288.15,
      surfaceTension = 0.072, // FIXED: Configurable, default water-air at 20°C
      geothermalGradient = 0.025 // FIXED: Configurable, default 25°C/km
    } = params;

    if (gasFlowRate <= 0 || liquidFlowRate <= 0) {
      throw new Error('Both gas and liquid flow rates are required for multiphase calculations');
    }

    const surfaceTemp = temperature;
    let currentPressure = injectionPressure * 1000; // Pa

    let totalFrictionLoss = 0;
    let totalPressureDrop = 0;
    const segmentResults: SegmentResult[] = [];
    const warnings: string[] = [];
    let cumulativeDepth = 0;
    let maxVelocity = 0;
    let maxVelocitySegment = 0;
    let sumVoidFraction = 0;
    let segmentCount = 0;

    const allSegments = [...segments];
    const totalSegmentLength = segments.reduce((sum, seg) => sum + (seg.length || 0), 0);
    const openHoleLength = Math.max(0, wellDepth - totalSegmentLength);

    if (openHoleLength > 0.1) {
      if (openHoleDiameter <= 0) throw new Error("Open hole diameter must be a positive value.");
      allSegments.push({
        id: -1,
        diameter: openHoleDiameter,
        length: openHoleLength,
        roughness: DEFAULT_OPEN_HOLE_ROUGHNESS,
      });
    }

    for (let index = 0; index < allSegments.length; index++) {
      const segment = allSegments[index];
      const D = segment.diameter / 1000; // m
      const L = segment.length; // m

      if (D <= 0) throw new Error(`Invalid diameter for segment ${index + 1}`);

      const depthMidpoint = cumulativeDepth + L / 2;
      const T_segment = GasProperties.calculateTemperature(surfaceTemp, depthMidpoint);

      // Calculate gas properties
      const Z = GasProperties.calculateCompressibility(currentPressure, T_segment, gasSpecificGravity);
      const rho_gas = GasProperties.calculateGasDensity(currentPressure, T_segment, gasSpecificGravity, Z);
      const M_gas = gasSpecificGravity * 28.97;
      const mu_gas = GasProperties.calculateGasViscosity(rho_gas, T_segment, M_gas);

      // Calculate multiphase properties
      const mpProps = MultiphaseFlow.calculateMultiphaseProperties(
        gasFlowRate, liquidFlowRate, D, currentPressure, T_segment,
        fluidDensity, rho_gas, fluidViscosity, mu_gas, Z, surfaceTension // FIXED: Pass configurable surface tension
      );

      sumVoidFraction += mpProps.gasVoidFraction;
      segmentCount++;

      const V = mpProps.mixtureVelocity;

      // Calculate superficial velocities once (needed for Mach check and friction factor)
      const { Vsg, Vsl } = MultiphaseFlow.calculateSuperficialVelocities(
        gasFlowRate, liquidFlowRate, D, currentPressure, T_segment, rho_gas,
        101325, 288.15, Z
      );

      // CRITICAL FIX: Mach number check for gas phase in multiphase flow
      const speedOfSound = GasProperties.calculateSpeedOfSound(T_segment, Z, gasSpecificGravity);
      const machNumber = GasProperties.calculateMachNumber(Vsg, speedOfSound);

      if (machNumber > 0.3 && machNumber <= 0.8) {
        const hasMachWarning = warnings.some(w => w.includes('Mach number'));
        if (!hasMachWarning) {
          warnings.push(`⚠️ Compressibility Warning: Gas phase Mach number ${machNumber.toFixed(3)} in segment ${index + 1}. Multiphase results may have ±10-15% error.`);
        }
      } else if (machNumber > 0.8) {
        const hasMachError = warnings.some(w => w.includes('CRITICAL'));
        if (!hasMachError) {
          warnings.push(`🚨 CRITICAL: Gas phase Mach ${machNumber.toFixed(3)} in segment ${index + 1} approaching sonic. Results INVALID for multiphase flow.`);
        }
      }

      // CRITICAL FIX: Erosion velocity check using ACTUAL phase velocities
      // API RP 14E erosion velocity: V_erosion = c / √ρ
      // where c = 100 for continuous service, 125 for intermittent
      const c_erosion = 100; // Conservative for continuous service

      // ROBUSTNESS FIX: Guard against division by very small densities
      // At very low densities (< 1 kg/m³), erosion velocity becomes unrealistically high
      // Skip erosion check in these cases as the correlation is not valid
      if (rho_gas > 1 && mpProps.actualGasVelocity) {
        const V_erosion_gas = c_erosion / Math.sqrt(rho_gas);
        if (isFinite(V_erosion_gas) && mpProps.actualGasVelocity > V_erosion_gas) {
          const hasErosionWarning = warnings.some(w => w.includes('Erosion'));
          if (!hasErosionWarning) {
            warnings.push(`⚠️ EROSION WARNING: Actual gas velocity ${mpProps.actualGasVelocity.toFixed(1)} m/s exceeds erosion limit ${V_erosion_gas.toFixed(1)} m/s in segment ${index + 1}. Expect accelerated wear. Consider larger diameter.`);
          }
        }
      }

      if (fluidDensity > 1 && mpProps.actualLiquidVelocity) {
        const V_erosion_liquid = c_erosion / Math.sqrt(fluidDensity);
        if (isFinite(V_erosion_liquid) && mpProps.actualLiquidVelocity > V_erosion_liquid) {
          const hasErosionWarning = warnings.some(w => w.includes('Erosion'));
          if (!hasErosionWarning) {
            warnings.push(`⚠️ EROSION WARNING: Actual liquid velocity ${mpProps.actualLiquidVelocity.toFixed(1)} m/s exceeds erosion limit ${V_erosion_liquid.toFixed(1)} m/s in segment ${index + 1}. Expect accelerated wear.`);
          }
        }
      }

      // PRIORITY 2 FIX: Dimensionless number validation
      const Froude = MultiphaseFlow.calculateFroudeNumber(V, D);
      const Weber = MultiphaseFlow.calculateWeberNumber(V, D, mpProps.mixtureDensity, surfaceTension);

      // Froude number validation for slug flow
      if (mpProps.flowPattern === 'Slug' && Froude > 3.5) {
        const hasFroudeWarning = warnings.some(w => w.includes('Froude'));
        if (!hasFroudeWarning) {
          warnings.push(`⚠️ Flow Pattern Warning: Froude number ${Froude.toFixed(2)} > 3.5 in segment ${index + 1}. Transition to churn flow likely. Flow pattern prediction may be inaccurate.`);
        }
      }

      // Weber number validation for annular flow
      if ((mpProps.flowPattern === 'Annular' || mpProps.flowPattern === 'Annular-Mist') && Weber > 100) {
        const hasWeberWarning = warnings.some(w => w.includes('Weber'));
        if (!hasWeberWarning) {
          warnings.push(`ℹ️ Flow Pattern Note: Weber number ${Weber.toFixed(1)} > 100 in segment ${index + 1}. Significant droplet entrainment expected in annular flow.`);
        }
      }

      if (V > maxVelocity) {
        maxVelocity = V;
        maxVelocitySegment = index + 1;
      }

      const Re = this.calculateReynolds(V, D, mpProps.mixtureDensity, mpProps.mixtureViscosity);
      const relativeRoughness = segment.roughness / (D * 1000);

      // Use two-phase friction factor
      const f = MultiphaseFlow.calculateTwoPhasefrictionFactor(
        Re, relativeRoughness, mpProps.liquidHoldup, Vsg, Vsl
      );

      const hf = V === 0 ? 0 : f * (L / D) * (Math.pow(V, 2) / (2 * GRAVITY));
      const frictionPressureLoss = mpProps.mixtureDensity * GRAVITY * hf;
      const hydrostaticGain = mpProps.mixtureDensity * GRAVITY * L;

      let minorLoss = 0;
      if (index === 0) {
        minorLoss += ENTRY_LOSS_COEFFICIENT * mpProps.mixtureDensity * Math.pow(V, 2) / 2;
      }

      if (index > 0) {
        const prevD = allSegments[index - 1].diameter / 1000;
        const prevA = PI * Math.pow(prevD / 2, 2);
        const A = PI * Math.pow(D / 2, 2);

        if (A > 0 && prevA > 0) {
          // CRITICAL FIX: Continuity equation: prevV * prevA = V * A
          // Therefore: prevV = V * (A / prevA)
          const prevV = V * (A / prevA);

          if (A < prevA) {
            const areaRatio = A / prevA;
            const Cc = 0.62 + 0.38 * Math.pow(areaRatio, 3);
            const Kc = Math.pow((1 / Cc) - 1, 2);
            minorLoss += Kc * mpProps.mixtureDensity * Math.pow(V, 2) / 2;
          } else if (A > prevA) {
            const Ke = Math.pow(1 - (prevA / A), 2);
            minorLoss += Ke * mpProps.mixtureDensity * Math.pow(prevV, 2) / 2;
          }
        }
      }

      // CRITICAL FIX: Kinetic energy (acceleration) term for MULTIPHASE
      // ΔP_acceleration = ρ_mixture * (V2² - V1²) / 2
      // CRITICAL for multiphase: gas expansion causes significant velocity changes
      let accelerationPressureLoss = 0;
      if (index > 0) {
        const prevD = allSegments[index - 1].diameter / 1000;
        const prevA = PI * Math.pow(prevD / 2, 2);
        const A = PI * Math.pow(D / 2, 2);
        // Continuity equation: Q = V*A, conserved between segments
        // prevV * prevA = V * A, therefore: prevV = V * (A / prevA)
        // For multiphase with gas expansion, this is an approximation assuming
        // the mixture volumetric flow rate is approximately conserved
        const prevV = V * (A / prevA); // Continuity: prevV*prevA = V*A
        accelerationPressureLoss = mpProps.mixtureDensity * (Math.pow(V, 2) - Math.pow(prevV, 2)) / 2;
      }

      const inletPressure = currentPressure;
      const netPressureChange = hydrostaticGain - frictionPressureLoss - minorLoss - accelerationPressureLoss;
      currentPressure += netPressureChange;

      // CRITICAL FIX: Vapor pressure check for liquid phase in multiphase
      // Check if liquid phase pressure drops below vapor pressure
      const P_vapor = GasProperties.calculateVaporPressure(T_segment);
      const hasCavitationWarning = warnings.some(w => w.includes('Cavitation'));

      if (currentPressure < P_vapor && !hasCavitationWarning) {
        warnings.push(`🚨 Cavitation risk: Multiphase pressure ${(currentPressure/1000).toFixed(1)} kPa below vapor pressure ${(P_vapor/1000).toFixed(1)} kPa in segment ${index + 1}. Liquid phase will flash to vapor.`);
      } else if (currentPressure < 0) {
        warnings.push(`🚨 CRITICAL: Negative pressure in segment ${index + 1}. Results INVALID.`);
      }

      const depthFrom = cumulativeDepth;
      cumulativeDepth += L;

      const flowRegime = Re < LAMINAR_FLOW_LIMIT ? 'Laminar' : Re < TURBULENT_FLOW_START ? 'Transitional' : 'Turbulent';

      if (segment.id !== -1) {
        // ROBUSTNESS FIX: Validate critical values before adding to results
        this.validateCalculationValue(V, 'mixture velocity', index + 1, 0, 100);
        this.validateCalculationValue(currentPressure, 'outlet pressure', index + 1, 0, 300e6);
        this.validateCalculationValue(mpProps.gasVoidFraction, 'void fraction', index + 1, 0, 1);
        this.validateCalculationValue(mpProps.liquidHoldup, 'liquid holdup', index + 1, 0, 1);
        this.validateCalculationValue(mpProps.mixtureDensity, 'mixture density', index + 1, 1, 2500);

        segmentResults.push({
          segmentNumber: index + 1,
          diameter: segment.diameter,
          length: L,
          depthFrom,
          depthTo: cumulativeDepth,
          velocity: V,
          reynoldsNumber: Re,
          flowRegime,
          frictionFactor: f,
          frictionLoss: frictionPressureLoss / 1000,
          hydrostaticGain: hydrostaticGain / 1000,
          minorLoss: minorLoss / 1000,
          netPressureChange: netPressureChange / 1000,
          inletPressure: inletPressure / 1000,
          outletPressure: currentPressure / 1000,
          gasVoidFraction: mpProps.gasVoidFraction,
          liquidHoldup: mpProps.liquidHoldup,
          flowPattern: mpProps.flowPattern,
          actualGasVelocity: mpProps.actualGasVelocity,
          actualLiquidVelocity: mpProps.actualLiquidVelocity,
          slipVelocity: mpProps.slipVelocity
        });
      }

      totalFrictionLoss += frictionPressureLoss;
      totalPressureDrop += frictionPressureLoss + minorLoss;
    }

    const avgVoidFraction = segmentCount > 0 ? sumVoidFraction / segmentCount : 0;
    const totalFlowRate = gasFlowRate + liquidFlowRate;

    return {
      segments: segmentResults,
      totalFrictionLoss: totalFrictionLoss / 1000,
      totalPressureDrop: totalPressureDrop / 1000,
      bottomPressure: currentPressure / 1000,
      maxFlowRate: totalFlowRate,
      actualFlowRate: totalFlowRate,
      maxSegmentVelocity: maxVelocity,
      maxVelocitySegment: maxVelocitySegment,
      warnings: warnings.length > 0 ? warnings : undefined,
      averageVoidFraction: avgVoidFraction
    };
  }
}
