export type InjectionType = 'liquid' | 'gas' | 'multiphase';

export interface Segment {
  id: number;
  diameter: number;
  length: number;
  roughness: number;
}

export interface ApiTubingPreset {
  name: string;
  id: number;
}

export interface SegmentResult {
  segmentNumber: number;
  diameter: number;
  length: number;
  depthFrom: number;
  depthTo: number;
  velocity: number;
  reynoldsNumber: number;
  flowRegime: 'Laminar' | 'Transitional' | 'Turbulent';
  frictionFactor: number;
  frictionLoss: number;
  hydrostaticGain: number;
  minorLoss: number;
  netPressureChange: number;
  inletPressure: number;
  outletPressure: number;
  // Gas-specific properties
  density?: number;
  temperature?: number;
  compressibility?: number;
  // Multiphase-specific properties
  gasVoidFraction?: number;
  liquidHoldup?: number;
  flowPattern?: string;
  // CRITICAL: Actual phase velocities for erosion analysis
  actualGasVelocity?: number;
  actualLiquidVelocity?: number;
  slipVelocity?: number;
}

export interface CalculationResults {
  segments: SegmentResult[];
  totalFrictionLoss: number;
  totalPressureDrop: number;
  bottomPressure: number;
  maxFlowRate: number;
  actualFlowRate: number;
  maxSegmentVelocity: number;
  maxVelocitySegment: number;
  warnings?: string[];
  // Gas-specific results
  averageGasDensity?: number;
  averageCompressibility?: number;
  // Multiphase-specific results
  averageVoidFraction?: number;
  flowRegimeMap?: string;
}

export interface CalculationParams {
  segments: Segment[];
  flowRate: number;
  injectionPressure: number;
  bottomholePressure: number;
  fluidDensity: number;
  fluidViscosity: number;
  wellDepth: number;
  openHoleDiameter: number;
  injectionType: InjectionType;
  // Gas-specific parameters
  gasSpecificGravity?: number;
  gasViscosity?: number;
  temperature?: number;
  // Multiphase parameters
  gasFlowRate?: number;
  liquidFlowRate?: number;
  gasDensity?: number;
}