// Gravitational constant in m/s^2
export const GRAVITY = 9.81;

// Mathematical constant Pi
export const PI = Math.PI;

// Velocity limit for erosion warning (m/s), based on API RP 14E guidelines
export const VELOCITY_WARNING_LIMIT = 20;

// Velocity limit for critical erosion risk (m/s)
export const VELOCITY_ERROR_LIMIT = 25;

// Reynolds number below which flow is considered laminar
export const LAMINAR_FLOW_LIMIT = 2300;

// Reynolds number above which flow is considered turbulent
export const TURBULENT_FLOW_START = 4000;

// Conversion factor for m³/day to m³/s
export const SECONDS_PER_DAY = 86400;

// Minor loss coefficient for a sharp-edged pipe inlet (K=0.5)
export const ENTRY_LOSS_COEFFICIENT = 0.5;

// Assumed absolute roughness for a typical open hole or casing (in mm)
export const DEFAULT_OPEN_HOLE_ROUGHNESS = 0.5;
