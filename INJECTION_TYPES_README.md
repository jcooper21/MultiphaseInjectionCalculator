# Well Injection Calculator - Injection Types

This document describes the new capabilities added to the Well Injection Calculator to support **single phase gas injection** and **multiphase (gas + liquid) injection** in addition to the original liquid injection calculations.

## Overview

The calculator now supports three injection types:

1. **Liquid Injection** - Original single-phase liquid injection (water, brine, etc.)
2. **Gas Injection** - Single-phase gas injection with real gas behavior
3. **Multiphase Injection** - Two-phase gas-liquid injection with flow pattern analysis

## Features Added

### 1. Single Phase Gas Injection

Gas injection calculations account for:

- **Real Gas Behavior**: Uses compressibility (Z-factor) calculations based on Standing-Katz correlations
- **Pressure-Dependent Density**: Gas density varies with pressure and temperature using the real gas equation of state
- **Temperature Effects**: Geothermal gradient applied with depth (default 25°C/km)
- **Gas Viscosity**: Lee-Gonzalez-Eakin correlation for gas viscosity
- **Compressibility Effects**: Volume changes with pressure accounted for in flow calculations

#### Gas-Specific Parameters:
- **Gas Specific Gravity**: Relative to air (typical range: 0.55-0.75 for natural gas)
- **Surface Temperature**: Starting temperature in °C (temperature increases with depth)
- **Gas Flow Rate**: At standard conditions (15°C, 101.325 kPa)

#### Gas Results Include:
- Average gas density throughout the well
- Average Z-factor (compressibility factor)
- Temperature profile with depth
- Density variations per segment

### 2. Multiphase (Gas + Liquid) Injection

Multiphase flow calculations use simplified Beggs-Brill correlations for:

- **Flow Pattern Determination**: Identifies flow regimes (Bubble, Slug, Annular, Mist, etc.)
- **Liquid Holdup**: Fraction of pipe volume occupied by liquid
- **Gas Void Fraction**: Fraction of pipe volume occupied by gas
- **Two-Phase Friction**: Enhanced friction factor accounting for phase interactions
- **Mixture Properties**: Density and viscosity of gas-liquid mixture

#### Multiphase-Specific Parameters:
- **Gas Flow Rate**: Gas volumetric rate at standard conditions (m³/day)
- **Liquid Flow Rate**: Liquid volumetric rate (m³/day)
- **Liquid Properties**: Density and viscosity of liquid phase
- **Gas Properties**: Specific gravity and temperature

#### Multiphase Results Include:
- Average gas void fraction
- Average liquid holdup
- Flow pattern for each segment
- Void fraction variations per segment

## Physics & Correlations

### Gas Properties Module ([engine/GasProperties.ts](engine/GasProperties.ts))

**Gas Density Calculation:**
```
ρ_gas = P / (Z * R_specific * T)
```

**Z-Factor (Compressibility):**
- Uses Dranchuk-Abu-Kassem simplified correlation
- Pseudo-critical properties from Sutton correlations
- Accounts for non-ideal gas behavior

**Gas Viscosity:**
- Lee-Gonzalez-Eakin correlation
- Function of density, temperature, and molecular weight

**Temperature Profile:**
```
T(depth) = T_surface + gradient * depth
```
Default gradient: 0.025 K/m (25°C/km)

### Multiphase Flow Module ([engine/MultiphaseFlow.ts](engine/MultiphaseFlow.ts))

**Flow Pattern Determination:**
Based on superficial velocities and input liquid fraction:
- Bubble: λ > 0.99 (mostly liquid)
- Slug: 0.4 < λ < 0.99, low gas velocity
- Annular: λ < 0.4, high gas velocity
- Mist: λ < 0.01 (mostly gas)

**Liquid Holdup Correlation:**
Pattern-dependent holdup:
- Bubble flow: H_L ≈ λ + 0.05
- Slug flow: H_L = λ + 0.1(1-λ)
- Annular flow: H_L ≈ 0.5λ
- Mist flow: H_L ≈ 0.3λ

**Mixture Properties:**
```
ρ_mixture = H_L * ρ_liquid + (1 - H_L) * ρ_gas
μ_mixture = H_L * μ_liquid + (1 - H_L) * μ_gas
```

**Two-Phase Friction Factor:**
```
f_two_phase = f_single_phase * φ
```
Where φ is a two-phase multiplier based on flow characteristics

## User Interface Changes

### Injection Type Selection
- Three buttons at the top of Parameters tab: Liquid, Gas, Multiphase
- Dynamically changes input fields based on selection

### Conditional Input Fields
- **Liquid mode**: Original fields (flow rate, density, viscosity)
- **Gas mode**: Gas flow rate, specific gravity, temperature
- **Multiphase mode**: Both gas and liquid flow rates, all fluid properties

### Enhanced Results Display
- **Gas calculations** show:
  - Average gas density
  - Average Z-factor
  - Temperature per segment
  - Density per segment

- **Multiphase calculations** show:
  - Average void fraction
  - Average liquid holdup
  - Flow pattern per segment
  - Void fraction per segment

## Typical Parameter Values

### Natural Gas Injection
- Specific Gravity: 0.60-0.70 (natural gas)
- Temperature: 15-25°C (surface)
- Flow Rate: 10,000-100,000 m³/day

### Multiphase Injection
- Gas-Liquid Ratio: Varies widely (1:1 to 100:1)
- Liquid Density: 1000-1200 kg/m³ (water/brine)
- Liquid Viscosity: 0.001-0.01 Pa·s

## Technical Notes

### Assumptions & Limitations

1. **Gas calculations**:
   - Ideal gas at low pressures (< 1 MPa), real gas behavior at higher pressures
   - Geothermal gradient is constant
   - No heat transfer to surroundings (adiabatic)
   - No phase changes

2. **Multiphase calculations**:
   - Vertical or near-vertical flow assumed
   - Steady-state flow
   - No slip between phases (simplified)
   - Beggs-Brill correlations calibrated for oil & gas wells

3. **General**:
   - Friction factors from Swamee-Jain equation
   - Minor losses at area changes
   - No chemical reactions or mass transfer

### Validation Recommendations

For critical applications, validate results against:
- Commercial flow simulation software (PIPESIM, OLGA)
- Field measurements
- More detailed correlations (e.g., Hagedorn-Brown for multiphase)

## File Structure

```
Well-Injection-Calculation-main/
├── types.ts                          # Updated with injection types
├── engine/
│   ├── GasProperties.ts             # NEW: Gas property calculations
│   └── MultiphaseFlow.ts            # NEW: Multiphase flow correlations
├── services/
│   └── calculatorService.ts         # Updated with 3 calculation methods
├── components/
│   ├── ParametersTab.tsx            # Updated with type selection & fields
│   └── ResultsTab.tsx               # Updated with gas/multiphase results
└── App.tsx                          # Updated with new state & validation
```

## Example Usage

### Gas Injection Example
1. Select "Gas" injection type
2. Set gas flow rate: 50,000 m³/day (standard conditions)
3. Set gas specific gravity: 0.65 (natural gas)
4. Set surface temperature: 15°C
5. Configure tubing and pressures as normal
6. Run analysis to see:
   - Gas density variations with depth/pressure
   - Z-factor changes
   - Temperature profile

### Multiphase Injection Example
1. Select "Multiphase" injection type
2. Set gas flow rate: 30,000 m³/day (std)
3. Set liquid flow rate: 100 m³/day
4. Configure both gas and liquid properties
5. Run analysis to see:
   - Flow patterns in each segment (Slug, Annular, etc.)
   - Void fractions
   - Two-phase pressure drops

## References

1. Standing, M.B. and Katz, D.L. (1942). "Density of Natural Gases"
2. Lee, A.L., Gonzalez, M.H., and Eakin, B.E. (1966). "The Viscosity of Natural Gases"
3. Beggs, H.D. and Brill, J.P. (1973). "A Study of Two-Phase Flow in Inclined Pipes"
4. Dranchuk, P.M. and Abu-Kassem, J.H. (1975). "Calculation of Z Factors For Natural Gases"

## Future Enhancements

Potential improvements for future versions:
- More sophisticated multiphase correlations (Hagedorn-Brown, Duns-Ros)
- Non-isothermal effects
- Foam injection modeling
- CO₂ injection with phase changes
- Horizontal/deviated well support
- Time-dependent (transient) analysis
