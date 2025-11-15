/**
 * Standing-Katz Z-Factor Interpolation
 *
 * Implements 2D bilinear interpolation on Standing-Katz chart data
 * for accurate gas compressibility factor calculation
 *
 * Accuracy: ±0.1-0.5% (reference standard)
 */

import { STANDING_KATZ_DATA, isInStandingKatzRange } from './StandingKatzData';

// Re-export for convenience
export { isInStandingKatzRange } from './StandingKatzData';

/**
 * Find the index of the lower bound in a sorted array
 * Uses binary search for efficiency
 */
function findLowerIndex(array: number[], value: number): number {
  // Handle edge cases
  if (value <= array[0]) return 0;
  if (value >= array[array.length - 1]) return array.length - 2;

  // Binary search
  let left = 0;
  let right = array.length - 1;

  while (right - left > 1) {
    const mid = Math.floor((left + right) / 2);
    if (array[mid] <= value) {
      left = mid;
    } else {
      right = mid;
    }
  }

  return left;
}

/**
 * Linear interpolation between two points
 */
function linearInterpolate(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0; // Avoid division by zero
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}

/**
 * 2D Bilinear interpolation
 *
 * Given a grid of points and a target (x, y), interpolates the value z
 * Uses the four surrounding grid points:
 *   (x0, y0) -> z00    (x1, y0) -> z10
 *   (x0, y1) -> z01    (x1, y1) -> z11
 *
 * @param x Target x value (Pr in our case)
 * @param y Target y value (Tr in our case)
 * @param x0 Lower x grid value
 * @param x1 Upper x grid value
 * @param y0 Lower y grid value
 * @param y1 Upper y grid value
 * @param z00 Value at (x0, y0)
 * @param z10 Value at (x1, y0)
 * @param z01 Value at (x0, y1)
 * @param z11 Value at (x1, y1)
 * @returns Interpolated z value
 */
function bilinearInterpolate(
  x: number,
  y: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z00: number,
  z10: number,
  z01: number,
  z11: number
): number {
  // Handle edge case where grid points coincide
  if (x1 === x0 && y1 === y0) return z00;
  if (x1 === x0) return linearInterpolate(y, y0, y1, z00, z01);
  if (y1 === y0) return linearInterpolate(x, x0, x1, z00, z10);

  // Interpolate in x direction at y0
  const z_y0 = linearInterpolate(x, x0, x1, z00, z10);

  // Interpolate in x direction at y1
  const z_y1 = linearInterpolate(x, x0, x1, z01, z11);

  // Interpolate in y direction
  const z = linearInterpolate(y, y0, y1, z_y0, z_y1);

  return z;
}

/**
 * Calculate Z-factor using Standing-Katz chart interpolation
 *
 * This is the reference standard for gas compressibility factors.
 * All correlation equations are approximations to this data.
 *
 * @param Pr Reduced pressure (P/Ppc)
 * @param Tr Reduced temperature (T/Tpc)
 * @returns Z-factor (compressibility factor)
 * @throws Error if Pr or Tr are outside the valid range
 */
export function calculateZFactorStandingKatz(Pr: number, Tr: number): number {
  // Validate input range
  if (!isInStandingKatzRange(Pr, Tr)) {
    throw new Error(
      `Standing-Katz interpolation: Pr=${Pr.toFixed(2)}, Tr=${Tr.toFixed(2)} ` +
      `outside valid range (Pr: 0.2-15, Tr: 0.7-3.0)`
    );
  }

  const { Tr_values, Pr_values, Z_data } = STANDING_KATZ_DATA;

  // Find surrounding indices in Tr array
  const Tr_index_lower = findLowerIndex(Tr_values, Tr);
  const Tr_index_upper = Math.min(Tr_index_lower + 1, Tr_values.length - 1);

  // Find surrounding indices in Pr array
  const Pr_index_lower = findLowerIndex(Pr_values, Pr);
  const Pr_index_upper = Math.min(Pr_index_lower + 1, Pr_values.length - 1);

  // Get grid points
  const Tr0 = Tr_values[Tr_index_lower];
  const Tr1 = Tr_values[Tr_index_upper];
  const Pr0 = Pr_values[Pr_index_lower];
  const Pr1 = Pr_values[Pr_index_upper];

  // Get Z values at the four corners
  const Z00 = Z_data[Tr_index_lower][Pr_index_lower];  // (Pr0, Tr0)
  const Z10 = Z_data[Tr_index_lower][Pr_index_upper];  // (Pr1, Tr0)
  const Z01 = Z_data[Tr_index_upper][Pr_index_lower];  // (Pr0, Tr1)
  const Z11 = Z_data[Tr_index_upper][Pr_index_upper];  // (Pr1, Tr1)

  // Perform bilinear interpolation
  // Note: We use Pr as x and Tr as y for consistency
  const Z = bilinearInterpolate(Pr, Tr, Pr0, Pr1, Tr0, Tr1, Z00, Z10, Z01, Z11);

  // Validate result
  if (!isFinite(Z) || Z <= 0) {
    throw new Error(
      `Invalid Z-factor calculated from Standing-Katz interpolation: ${Z} ` +
      `at Pr=${Pr.toFixed(2)}, Tr=${Tr.toFixed(2)}`
    );
  }

  return Z;
}

/**
 * Calculate Z-factor with automatic method selection
 *
 * Prefers Standing-Katz interpolation when within range,
 * falls back to correlation methods for out-of-range conditions
 *
 * @param Pr Reduced pressure
 * @param Tr Reduced temperature
 * @param fallbackMethod Function to use when outside Standing-Katz range
 * @returns Z-factor
 */
export function calculateZFactorAuto(
  Pr: number,
  Tr: number,
  fallbackMethod?: (Pr: number, Tr: number) => number
): number {
  try {
    // Try Standing-Katz first (most accurate)
    if (isInStandingKatzRange(Pr, Tr)) {
      return calculateZFactorStandingKatz(Pr, Tr);
    }
  } catch (error) {
    // Fall through to fallback
  }

  // Use fallback method if provided
  if (fallbackMethod) {
    return fallbackMethod(Pr, Tr);
  }

  // Default fallback: ideal gas for very low pressure
  if (Pr < 0.2) {
    return 1.0;
  }

  // No fallback available
  throw new Error(
    `No Z-factor method available for Pr=${Pr.toFixed(2)}, Tr=${Tr.toFixed(2)}`
  );
}
