/**
 * Debug Z-factor calculation
 */

import { GasProperties } from './engine/GasProperties';

console.log('=== Z-FACTOR DEBUG ===\n');

const P = 10e6; // 10 MPa = 10,000,000 Pa
const T = 313.15; // 313.15 K (40°C)
const gamma = 0.65;

// Calculate pseudo-critical properties
const Tpc = 169.2 + 349.5 * gamma - 74.0 * Math.pow(gamma, 2);
const Ppc = (4.892 - 0.4048 * gamma) * 1e6;

console.log(`Input conditions:`);
console.log(`  P = ${(P/1e6).toFixed(2)} MPa`);
console.log(`  T = ${T.toFixed(2)} K`);
console.log(`  γ = ${gamma}`);
console.log();

console.log(`Pseudo-critical properties:`);
console.log(`  Tpc = ${Tpc.toFixed(2)} K`);
console.log(`  Ppc = ${(Ppc/1e6).toFixed(2)} MPa`);
console.log();

// Reduced properties
const Tr = T / Tpc;
const Pr = P / Ppc;

console.log(`Reduced properties:`);
console.log(`  Tr = ${Tr.toFixed(3)}`);
console.log(`  Pr = ${Pr.toFixed(3)}`);
console.log();

// Manual Hall-Yarborough iteration
const t = 1.0 / Tr;
const A_hy = 0.06125 * t * Math.exp(-1.2 * Math.pow(1 - t, 2));
const B = t * (14.76 - 9.76 * t + 4.58 * t * t);
const C = t * (90.7 - 242.2 * t + 42.4 * t * t);
const D = 2.18 + 2.82 * t;

console.log(`Hall-Yarborough parameters:`);
console.log(`  t = ${t.toFixed(4)}`);
console.log(`  A = ${A_hy.toFixed(6)}`);
console.log(`  B = ${B.toFixed(4)}`);
console.log(`  C = ${C.toFixed(2)}`);
console.log(`  D = ${D.toFixed(4)}`);
console.log();

console.log(`Manual Hall-Yarborough iteration:`);
let y = 0.001;
for (let i = 0; i < 20; i++) {
  const y2 = y * y;
  const y3 = y2 * y;
  const y4 = y3 * y;

  const F = -A_hy * Pr +
            (y + y2 + y3 - y4) / Math.pow(1 - y, 3) -
            B * y2 +
            C * Math.pow(y, D);

  const denom = Math.pow(1 - y, 4);
  const dFdy = (1 + 4*y + 4*y2 - 4*y3 + y4) / denom -
               2 * B * y +
               D * C * Math.pow(y, D - 1);

  const y_new = y - F / dFdy;
  const Z_current = A_hy * Pr / y;

  console.log(`  Iter ${i+1}: y=${y.toFixed(6)}, F=${F.toFixed(6)}, Z=${Z_current.toFixed(4)}`);

  if (Math.abs(y_new - y) < 1e-8) {
    y = y_new;
    console.log(`  Converged!`);
    break;
  }

  y = y_new;
  if (y < 0) y = 0.001;
  if (y > 0.99) y = 0.99;
}

const Z_manual = A_hy * Pr / y;
console.log(`  Final Z (manual): ${Z_manual.toFixed(4)}`);
console.log();

// Now call the actual function
const Z_calc = GasProperties.calculateCompressibility(P, T, gamma);
console.log(`Function result: Z = ${Z_calc.toFixed(4)}`);
console.log(`Expected Z (from Standing-Katz charts): ~0.75-0.85 for Pr=${Pr.toFixed(2)}, Tr=${Tr.toFixed(2)}`);
console.log();

if (Math.abs(Z_calc - Z_manual) > 0.01) {
  console.log(`⚠️  WARNING: Function result differs from manual calculation!`);
} else {
  console.log(`✅ Function result matches manual calculation`);
}
