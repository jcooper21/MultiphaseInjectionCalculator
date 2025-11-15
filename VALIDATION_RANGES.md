# Validation Ranges Documentation

**Purpose:** This document explains the rationale behind validation ranges used throughout the calculator to ensure physically realistic and safe calculations for professional petroleum engineering use.

**Last Updated:** 2025-11-15

---

## Overview

The calculator implements strict validation ranges to:
1. **Prevent non-physical results** (e.g., negative density, supersonic flow)
2. **Ensure equation validity** (correlations have limited applicability ranges)
3. **Warn about dangerous conditions** (erosion, sonic choking)
4. **Catch calculation errors early** (NaN, Infinity detection)

All ranges are based on:
- Physical laws and constraints
- Published correlation validity ranges
- Industry standards (API RP 14E, etc.)
- Typical petroleum engineering practice

---

## Gas Injection Validation Ranges

### 1. Gas Velocity: 0-150 m/s

**Code Location:** `services/calculatorService.ts:567`

```typescript
this.validateCalculationValue(V, 'velocity', index + 1, 0, 150);
```

**Rationale:**
- **Physical Constraint:** Must stay subsonic (M < 1.0)
- **Typical sonic velocity:** ~300-400 m/s for natural gas at typical conditions
- **Safety Factor:** 150 m/s ≈ M = 0.4-0.5 (well below sonic limit)
- **Design Practice:** Velocities >100 m/s rarely used due to:
  - High pressure drops
  - Erosion concerns
  - Noise and vibration

**Why Not Higher:**
- Compressible flow equations become increasingly inaccurate as M → 1.0
- Risk of sonic choking (M = 1.0) which invalidates all equations
- Explicit supersonic check throws hard error when V > speed_of_sound

**Typical Values:**
- Injection wells: 10-50 m/s
- Gas transmission: 5-30 m/s
- Emergency venting: 50-100 m/s

**References:**
- API RP 14E: Recommends M < 0.5 for safety
- GPSA Engineering Data Book: Typical velocities 15-60 m/s

---

### 2. Gas Density: 5-300 kg/m³

**Code Location:** `services/calculatorService.ts:569`

```typescript
this.validateCalculationValue(rho_gas, 'gas density', index + 1, 5, 300);
```

**Rationale:**

**Lower Limit (5 kg/m³):**
- Below this, gas is near-atmospheric pressure
- API RP 14E erosion correlation invalid for ρ < 10 kg/m³
- Real gas effects minimal (Z ≈ 1.0)
- Unlikely to have injection at such low density

**Upper Limit (300 kg/m³):**
- Corresponds to very high pressure (~50-100 MPa) or very low temperature
- Above this, approaching liquid-like densities
- Gas correlations may become less accurate
- Supercritical behavior dominates

**Typical Values:**
- Low pressure (1-5 MPa): 10-50 kg/m³
- Medium pressure (5-20 MPa): 50-150 kg/m³
- High pressure (20-50 MPa): 150-300 kg/m³

**Physical Context:**
- Air at STP: ~1.2 kg/m³
- Natural gas at 10 MPa, 40°C: ~70-100 kg/m³
- Natural gas at 50 MPa, 100°C: ~200-250 kg/m³

---

### 3. Temperature: 250-450 K (-23°C to 177°C)

**Code Location:** `services/calculatorService.ts:570`

```typescript
this.validateCalculationValue(T_segment, 'temperature', index + 1, 250, 450);
```

**Rationale:**

**Lower Limit (250 K = -23°C):**
- Below this, risk of hydrate formation (typically 0-10°C)
- Most injection operations above 10°C
- Correlations calibrated for typical reservoir temperatures
- Permafrost regions may operate near this limit

**Upper Limit (450 K = 177°C):**
- Typical geothermal gradient: ~25°C/km
- At 5 km depth: ~140-150°C (within range)
- Above 200°C, very deep wells or geothermal conditions
- Most injection wells: 20-150°C

**Typical Values:**
- Shallow wells (<1 km): 15-40°C
- Medium depth (1-3 km): 40-100°C
- Deep wells (3-5 km): 100-150°C
- Very deep (>5 km): 150-200°C

**Note:** For very deep wells (>5 km) or geothermal applications, this limit can be increased via configurable validation (see future enhancement).

---

### 4. Z-Factor: 0.2-1.5

**Code Location:** `services/calculatorService.ts:571`

```typescript
this.validateCalculationValue(Z, 'Z-factor', index + 1, 0.2, 1.5);
```

**Rationale:**

**Physical Meaning:**
- Z = 1.0: Ideal gas
- Z < 1.0: Attractive forces dominate (subcritical, moderate pressure)
- Z > 1.0: Repulsive forces dominate (supercritical, high pressure)

**Lower Limit (0.2):**
- Minimum Z occurs near critical point (Tr ≈ 1.0, Pr ≈ 2-3)
- Standing-Katz charts show Z_min ≈ 0.27 for natural gas
- Z = 0.2 allows some margin for very heavy gases or CO₂

**Upper Limit (1.5):**
- High pressure, high temperature conditions
- Standing-Katz shows Z < 1.4 for most conditions
- Z = 1.5 allows margin for very high pressure

**Typical Values:**
- Low pressure: Z ≈ 0.95-1.0
- Critical region: Z ≈ 0.3-0.8
- High pressure, high temp: Z ≈ 1.0-1.3

---

### 5. Pressure: 0-200 MPa (0-29,000 psi)

**Code Location:** `services/calculatorService.ts:568`

```typescript
this.validateCalculationValue(currentPressure, 'outlet pressure', index + 1, 0, 200e6);
```

**Rationale:**

**Upper Limit (200 MPa = 29,000 psi):**
- Far exceeds typical injection pressures
- Most wells: 5-50 MPa (700-7,000 psi)
- Ultra-deep wells: 100-150 MPa
- 200 MPa allows margin for extreme conditions

**Typical Values:**
- Shallow disposal: 5-15 MPa
- Deep disposal: 15-40 MPa
- EOR injection: 10-30 MPa
- CO₂ sequestration: 10-25 MPa

**Design Constraints:**
- Fracture pressure typically limits injection
- API 6A rated equipment: up to ~103 MPa (15,000 psi)
- Special equipment needed above 70 MPa

---

## Liquid Injection Validation Ranges

### 6. Liquid Velocity: 0-50 m/s

**Code Location:** `services/calculatorService.ts:321`

```typescript
this.validateCalculationValue(V, 'velocity', index + 1, 0, 50);
```

**Rationale:**

**Upper Limit (50 m/s):**
- **Erosion Limit:** API RP 14E recommends V < c/√ρ
  - For water (ρ = 1000 kg/m³): V_erosion ≈ 122/√1000 ≈ 3.9 m/s
  - For light oil (ρ = 800 kg/m³): V_erosion ≈ 4.3 m/s
- **Typical Practice:** 1-5 m/s to avoid erosion
- **50 m/s:** Safety margin for transient conditions or very clean fluids

**Typical Values:**
- Gravity drainage: 0.1-0.5 m/s
- Pumped injection: 0.5-3 m/s
- High-rate injection: 3-10 m/s
- >10 m/s: Erosion concerns, rarely used

**Why Higher Than Erosion Velocity:**
- Validation is for outlet pressure calculation, not design recommendation
- Erosion warnings provided separately
- Allows calculation of high-velocity scenarios for troubleshooting

---

### 7. Reynolds Number: 0-1×10⁸

**Code Location:** `services/calculatorService.ts:323`

```typescript
this.validateCalculationValue(Re, 'Reynolds number', index + 1, 0, 1e8);
```

**Rationale:**

**Upper Limit (1×10⁸):**
- Extremely high, rarely encountered
- Most flows: Re < 1×10⁷
- Allows calculation of any realistic scenario

**Physical Context:**
- **Laminar:** Re < 2,300
- **Transitional:** 2,300 < Re < 4,000
- **Turbulent:** Re > 4,000

**Typical Values:**
- Laminar flow: Re = 100-2,000
- Turbulent flow: Re = 10,000-1,000,000
- Very high velocity: Re = 1,000,000-10,000,000

**Friction Factor Validity:**
- Colebrook-White: Valid to Re = 1×10⁸
- Swamee-Jain: Valid to Re = 1×10⁸

---

## Friction Factor Validation

### 8. Single-Phase Friction Factor: 0.0001-0.15

**Code Location:** `services/calculatorService.ts:249-255`

```typescript
if (!isFinite(f) || f < 0.0001 || f > 0.15) {
  throw new Error(`Invalid friction factor: f=${f.toFixed(6)}`);
}
```

**Rationale:**

**Lower Limit (0.0001):**
- Hydraulically smooth pipe (ε/D → 0)
- Very high Reynolds number (Re > 1×10⁷)
- Blasius: f ≈ 0.316/Re^0.25 → f_min ≈ 0.0002 at Re = 1×10⁸

**Upper Limit (0.15):**
- Very rough pipe (ε/D ≈ 0.05)
- Laminar flow: f = 64/Re → f = 0.032 at Re = 2000
- Fully rough turbulent: f ≈ 0.05-0.1
- 0.15 allows margin for extreme roughness

**Typical Values:**
- Smooth steel pipe (turbulent): f = 0.01-0.02
- Commercial steel: f = 0.015-0.025
- Rough/corroded pipe: f = 0.03-0.06
- Laminar flow: f = 0.01-0.03

---

### 9. Two-Phase Friction Factor: 0.0001-3.0

**Code Location:** `services/calculatorService.ts:793-800`

```typescript
if (!isFinite(f) || f < 0.0001 || f > 3.0) {
  throw new Error(`Invalid two-phase friction factor: f=${f.toFixed(6)}`);
}
```

**Rationale:**

**Why Higher Than Single-Phase:**
- Two-phase multiplier: φ²_L or φ²_G
- Lockhart-Martinelli: φ² can reach 5-20
- Effective friction factor: f_TP = f_single × φ²

**Upper Limit (3.0):**
- Extreme two-phase conditions
- Slug flow with high liquid holdup
- Most conditions: f_TP < 1.0
- 3.0 allows for very high multipliers

**Typical Values:**
- Stratified flow: f_TP = 0.01-0.05
- Annular flow: f_TP = 0.02-0.1
- Slug flow: f_TP = 0.05-0.5
- Extreme conditions: f_TP = 0.5-2.0

---

## Erosion and Safety Limits

### 10. API RP 14E Erosion Velocity

**Code Location:** `services/calculatorService.ts:716-742`

**Formula:** V_erosion = c / √ρ

**Validity Range:**
- ρ > 10 kg/m³ (enforced in code)
- c = 122 for continuous service (m/s units)
- c = 152 for intermittent service

**Rationale:**
- Empirical correlation from field experience
- Conservative for most conditions
- Not valid at very low densities (ρ < 10 kg/m³)
- At low density, absolute velocity limit used instead

---

## Supersonic Flow Check

### 11. Mach Number: M < 1.0 (Hard Limit)

**Code Location:** `services/calculatorService.ts:563-568`

**Enforcement:**
```typescript
if (V > speedOfSound) {
  throw new Error(`SUPERSONIC FLOW: M=${machNumber.toFixed(2)} > 1.0`);
}
```

**Rationale:**
- **Critical Constraint:** All equations invalid for M ≥ 1.0
- Compressible flow becomes choked at M = 1.0
- Shock waves, discontinuities occur
- Requires specialized supersonic flow analysis

**Speed of Sound:**
- Natural gas at typical conditions: ~350-450 m/s
- Depends on temperature, Z-factor, molecular weight
- c = √(γ × Z × R × T / M)

---

## Standing-Katz Z-Factor Interpolation Range

### 12. Reduced Pressure: 0.2 ≤ Pr ≤ 15

**Code Location:** `engine/StandingKatzData.ts`

**Rationale:**
- Published Standing-Katz charts cover Pr = 0.2-15
- Below Pr = 0.2: Ideal gas (Z ≈ 1.0)
- Above Pr = 15: Rare, uses Beggs-Brill fallback

---

### 13. Reduced Temperature: 0.7 ≤ Tr ≤ 3.0

**Code Location:** `engine/StandingKatzData.ts`

**Rationale:**
- Original Standing-Katz: Tr = 1.0-3.0
- Extended to Tr = 0.7 for subcritical conditions
- Below Tr = 0.7: Very cold, near-liquid conditions
- Above Tr = 3.0: High temperature, Z ≈ 1.0 + small correction

---

## Configuring Validation Ranges

**Future Enhancement:** Validation ranges will be configurable via optional parameters:

```typescript
interface ValidationLimits {
  velocityMax: number;      // Default: 150 m/s (gas), 50 m/s (liquid)
  densityMin: number;       // Default: 5 kg/m³
  densityMax: number;       // Default: 300 kg/m³
  temperatureMin: number;   // Default: 250 K
  temperatureMax: number;   // Default: 450 K
  pressureMax: number;      // Default: 200e6 Pa
}

// Usage:
calculateGasInjection(params, {
  temperatureMax: 500  // Allow hotter for geothermal wells
});
```

**Use Cases:**
- Geothermal wells: Increase temperature limit
- Arctic conditions: Decrease temperature limit
- Ultra-deep wells: Increase pressure limit
- Specialized applications: Custom ranges

---

## References

1. **API RP 14E:** "Design and Installation of Offshore Production Platform Piping Systems"
   - Erosion velocity correlation
   - Velocity limits

2. **GPSA Engineering Data Book** (14th Edition)
   - Typical velocity ranges
   - Design practices

3. **Standing, M.B., & Katz, D.L. (1942):** "Density of Natural Gases"
   - Z-factor chart validity ranges

4. **Beggs, H.D., & Brill, J.P. (1973):** "A Study of Two-Phase Flow in Inclined Pipes"
   - Two-phase flow correlations
   - Friction factor ranges

5. **Colebrook, C.F. (1939):** "Turbulent Flow in Pipes"
   - Friction factor correlation validity

6. **McCain, W.D. (2017):** "Petroleum Reservoir Fluid Property Correlations"
   - Typical reservoir conditions
   - Property ranges

---

## Summary Table

| Parameter | Min | Max | Typical | Units | Basis |
|-----------|-----|-----|---------|-------|-------|
| **Gas velocity** | 0 | 150 | 10-50 | m/s | M < 0.5 safety |
| **Liquid velocity** | 0 | 50 | 1-5 | m/s | Erosion + margin |
| **Gas density** | 5 | 300 | 50-150 | kg/m³ | Practical range |
| **Temperature** | 250 | 450 | 300-400 | K | Typical wells |
| **Pressure** | 0 | 200 | 10-40 | MPa | Equipment limits |
| **Z-factor** | 0.2 | 1.5 | 0.7-1.1 | - | Physical range |
| **Reynolds No.** | 0 | 1e8 | 1e4-1e6 | - | Correlation limit |
| **f (single)** | 0.0001 | 0.15 | 0.015-0.03 | - | Colebrook range |
| **f (two-phase)** | 0.0001 | 3.0 | 0.02-0.5 | - | Multiplier effect |
| **Mach number** | 0 | 1.0 | 0.1-0.4 | - | Subsonic limit |

---

**Note:** These ranges are conservative and suitable for 95%+ of petroleum engineering applications. For specialized scenarios outside these ranges, contact support or modify validation limits accordingly.
