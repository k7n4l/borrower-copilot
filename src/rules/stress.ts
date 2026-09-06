import type { ProductType, StressOutput } from './types';
import { STRESS_RULES } from './constants';
import { calculateEMI, maxPrincipalForEmi } from '../utils/emi';

/**
 * STRESS-01/STRESS-02: applies an income-drop shock (all products) and,
 * for products typically offered at floating rates, a rate-rise shock —
 * then recomputes whether the recommended EMI still fits and reports it
 * plainly. These are documented planning shocks, not a prediction about
 * this specific borrower's actual risk.
 */
export function computeStress(
  currentSafeCeiling: number,
  currentEmi: number,
  productType: ProductType,
  fairRateMid: number,
  principal: number,
  tenureYears: number
): StressOutput {
  const stressedCeiling = Math.round(currentSafeCeiling * (1 - STRESS_RULES.INCOME_DROP_PCT));

  const isFloating = STRESS_RULES.FLOATING_RATE_PRODUCTS.includes(productType);
  const ratePlusBps = isFloating ? STRESS_RULES.RATE_RISE_BPS : 0;
  const stressedRate = fairRateMid + ratePlusBps / 10000;
  const stressedEmiAtSameAmount = Math.round(calculateEMI(principal, stressedRate, tenureYears));

  const verdictHolds = stressedEmiAtSameAmount <= stressedCeiling;

  const explanationParts: string[] = [
    `If your income fell by ${Math.round(STRESS_RULES.INCOME_DROP_PCT * 100)}%,`,
  ];
  if (isFloating) {
    explanationParts.push(`and the rate rose by ${(ratePlusBps / 100).toFixed(2)} percentage points (this product is typically floating-rate),`);
  }
  explanationParts.push(
    verdictHolds
      ? 'your EMI would still fit within a reduced safe ceiling — this loan has reasonable headroom.'
      : `your EMI of about \u20b9${Math.round(currentEmi).toLocaleString('en-IN')}/month would exceed a reduced safe ceiling of about \u20b9${stressedCeiling.toLocaleString('en-IN')}/month — consider a longer tenure or smaller amount for real safety margin.`
  );

  return {
    incomeDropPct: STRESS_RULES.INCOME_DROP_PCT,
    ratePlusBps,
    stressedSafeEmiCeiling: stressedCeiling,
    verdictHolds,
    explanation: explanationParts.join(' '),
    ruleRefs: isFloating ? ['STRESS-01', 'STRESS-02'] : ['STRESS-01'],
  };
}

/** Helper used by the engine to find the max affordable principal under stress, for messaging purposes. */
export function maxPrincipalUnderStress(stressedCeiling: number, rate: number, years: number): number {
  return Math.round(maxPrincipalForEmi(stressedCeiling, rate, years));
}
