# Numerical Robustness Analysis

**Date:** 2025-11-15
**Status:** Issues Found - Fixes Required

---

## Critical Bugs Found

### 1. ❌ CRITICAL: Wrong Continuity Equation in Multiphase Flow

**Location:** `calculatorService.ts:736`

**Current Code (WRONG):**
```typescript
const prevV = V * (prevA / A); // ❌ INCORRECT!
```

**Should Be:**
```typescript
const prevV = V * (A / prevA); // ✅ CORRECT
```

**Explanation:**
- Continuity equation: `Q = V × A`
- Between segments: `prevV × prevA = V × A`
- Therefore: `prevV = V × (A / prevA)`
- The current code has the ratio inverted!

**Impact:** CRITICAL - Calculates completely wrong velocities in multiphase flow, leading to:
- Incorrect acceleration pressure losses
- Incorrect minor losses
- Invalid erosion velocity predictions

**Note:** This same bug existed on line 762, but it was CORRECTLY fixed during earlier review. Line 736 was missed!

---

### 2. ⚠️ HIGH: Potential Division by Near-Zero in Erosion Velocity

**Location:** `calculatorService.ts:671-672`

**Current Code:**
```typescript
const V_erosion_gas = c_erosion / Math.sqrt(rho_gas);
const V_erosion_liquid = c_erosion / Math.sqrt(fluidDensity);
```

**Issue:**
- If `rho_gas` or `fluidDensity` approaches zero, `V_erosion` becomes `Infinity`
- While validation should prevent zero density, very low gas densities (< 1 kg/m³) can occur at very low pressures
- This causes `Infinity` values in warning messages

**Impact:** Medium - Causes misleading warning messages but doesn't break calculations

**Recommended Fix:**
```typescript
const V_erosion_gas = rho_gas > 1 ? c_erosion / Math.sqrt(rho_gas) : Infinity;
const V_erosion_liquid = fluidDensity > 1 ? c_erosion / Math.sqrt(fluidDensity) : Infinity;

// Skip erosion check if erosion velocity is unrealistic
if (mpProps.actualGasVelocity && isFinite(V_erosion_gas) && mpProps.actualGasVelocity > V_erosion_gas) {
  // ... warning
}
```

---

### 3. ⚠️ MEDIUM: Missing isFinite() Checks on Critical Results

**Locations:** Throughout calculation results

**Issue:**
- No checks for `NaN` or `Infinity` in final results
- Could propagate through to UI without detection

**Recommended Fix:** Add validation before returning results:
```typescript
// Before returning CalculationResults
if (!isFinite(currentPressure) || isNaN(currentPressure)) {
  throw new Error(`Invalid pressure calculation in segment ${index + 1}: ${currentPressure}`);
}
if (!isFinite(V) || isNaN(V) || V < 0) {
  throw new Error(`Invalid velocity calculation in segment ${index + 1}: ${V}`);
}
```

---

## Good Practices Already Implemented ✅

### Division by Zero Guards

1. **Reynolds Number** (`calculatorService.ts:125-126`):
```typescript
static calculateReynolds(velocity: number, diameter: number, density: number, viscosity: number): number {
  if (viscosity === 0 || diameter === 0) return 0; // ✅ GOOD
  return (density * velocity * diameter) / viscosity;
}
```

2. **Friction Factor** (`calculatorService.ts:138-139`):
```typescript
static calculateFrictionFactor(Re: number, relativeRoughness: number): number {
  if (Re <= 0) return 0; // ✅ GOOD
  if (Re < LAMINAR_FLOW_LIMIT) return 64 / Re;
  // ...
}
```

3. **Velocity Calculations** (multiple locations):
```typescript
const hf = V === 0 ? 0 : f * (L / D) * (Math.pow(V, 2) / (2 * GRAVITY)); // ✅ GOOD
```

4. **Area Validation** (`calculatorService.ts:211`):
```typescript
if (A <= 0) throw new Error(`Invalid segment diameter for segment ${index + 1}`); // ✅ GOOD
```

5. **Averaging with Count Check** (`calculatorService.ts:547-548`):
```typescript
const avgDensity = segmentCount > 0 ? sumDensity / segmentCount : 0; // ✅ GOOD
const avgZ = segmentCount > 0 ? sumZ / segmentCount : 1; // ✅ GOOD
```

6. **Max Flow Rate** (`calculatorService.ts:323-329`):
```typescript
let maxFlowRate: number;
if (availablePressure <= 0) {
  maxFlowRate = 0;
} else if (totalPressureDrop <= 0 || Q === 0) { // ✅ GOOD guard
  maxFlowRate = Infinity;
} else {
  maxFlowRate = flowRate * Math.pow(availablePressure / totalPressureDrop, 1 / flowExponent);
}
```

7. **Multiphase: Safe Void Fraction** (`MultiphaseFlow.ts:69-71`):
```typescript
// Prevent division by zero
const safeAlpha = Math.max(0.01, Math.min(0.99, alpha)); // ✅ EXCELLENT!
const safeLiquidHoldup = 1 - safeAlpha;
```

8. **Multiphase: Mixture Velocity** (`MultiphaseFlow.ts:95, 186, 337`):
```typescript
const Vm = Vsg + Vsl;
if (Vm === 0) return 'No-Flow'; // ✅ GOOD
```

9. **Multiphase: Slip Ratio** (`MultiphaseFlow.ts:371`):
```typescript
const S = liquidHoldup / (lambda + 1e-10); // ✅ EXCELLENT! Small epsilon guard
```

---

## Potential Edge Cases to Monitor

### 1. Very Low Gas Densities
- At very low pressures (< 100 kPa), gas density can be < 1 kg/m³
- **Current Status:** Validation allows this, calculations handle it
- **Recommendation:** Add warning if gas density < 5 kg/m³

### 2. Very High Velocities
- At sonic conditions (M > 1), equations become invalid
- **Current Status:** ✅ Mach number warnings already implemented
- **Additional:** Could add hard error at M > 1.0

### 3. Temperature Extremes
- Very high temperatures (> 450K) can cause Z-factor correlations to be less accurate
- **Current Status:** Validation warns if T > 500K
- **Recommendation:** Add warning if T > 450K for Z-factor accuracy

### 4. Near-Critical Conditions
- Near gas critical point, Z-factor can have large gradients
- **Current Status:** Beggs-Brill correlation handles this reasonably
- **Recommendation:** Add warning if Tr near 1.0 (within ±10%)

---

## Summary of Required Fixes

| Priority | Location | Issue | Fix Complexity |
|----------|----------|-------|----------------|
| **CRITICAL** | calculatorService.ts:736 | Wrong continuity equation | Simple (1 line) |
| **HIGH** | calculatorService.ts:671-672 | Division by near-zero in erosion calc | Medium (add guards) |
| **MEDIUM** | Throughout | Missing NaN/Infinity checks | Medium (add validation) |
| **LOW** | Various | Additional edge case warnings | Low (add warnings) |

---

## Test Cases for Numerical Robustness

### Edge Cases to Test:
1. ✅ Zero flow rate (already tested)
2. ✅ Very low flow rate (already tested)
3. ⚠️ Very low pressure (< 500 kPa)
4. ⚠️ Very high pressure (> 50 MPa)
5. ⚠️ Very low gas density (< 5 kg/m³)
6. ⚠️ Sonic conditions (M approaching 1.0)
7. ⚠️ Zero liquid holdup (gas-only, should error)
8. ⚠️ Zero gas holdup (liquid-only in multiphase, should error)

---

## Recommendations for Additional Robustness

### 1. Add Result Validation Function
```typescript
private static validateSegmentResult(result: SegmentResult, segmentNumber: number): void {
  if (!isFinite(result.velocity) || result.velocity < 0) {
    throw new Error(`Invalid velocity in segment ${segmentNumber}: ${result.velocity}`);
  }
  if (!isFinite(result.outletPressure)) {
    throw new Error(`Invalid pressure in segment ${segmentNumber}: ${result.outletPressure}`);
  }
  if (result.density !== undefined && (!isFinite(result.density) || result.density <= 0)) {
    throw new Error(`Invalid density in segment ${segmentNumber}: ${result.density}`);
  }
}
```

### 2. Add Intermediate Calculation Checks
```typescript
// After critical calculations
if (!isFinite(Z) || Z <= 0 || Z > 2) {
  throw new Error(`Z-factor out of range: ${Z} at P=${pressure/1e6}MPa, T=${temperature}K`);
}
```

### 3. Add Physical Bounds Validation
```typescript
// Check for physically impossible conditions
if (currentPressure > 200e6) { // > 200 MPa
  warnings.push('⚠️ Pressure exceeds typical well conditions');
}
if (V > speedOfSound) {
  throw new Error('Supersonic flow detected - equations invalid');
}
```

---

## Conclusion

**Overall Assessment:** The code has **good foundational guards** but has **1 critical bug** and several **missing edge case checks**.

**Immediate Actions Required:**
1. ❌ Fix line 736 continuity equation (CRITICAL)
2. ⚠️ Add guards for erosion velocity division
3. ⚠️ Add NaN/Infinity validation on results

**Code Quality:** 7/10 (with critical bug), 8.5/10 (after fixes)

**Recommended Next Steps:**
1. Apply fixes for critical and high-priority issues
2. Add comprehensive NaN/Infinity checks
3. Create edge case test suite
4. Run all tests to verify fixes don't break existing functionality

---

**Analysis Date:** 2025-11-15
**Reviewed By:** Comprehensive code analysis
**Next Review:** After applying fixes
