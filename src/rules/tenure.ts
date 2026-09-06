import type { ProductType, TenureOutput } from './types';
import { TENURE_RULES } from './constants';
import { calculateEMI, totalInterest } from '../utils/emi';

/**
 * TEN-01/TEN-02/TEN-03: shows 2-3 sensible tenure options (Short/Balanced/
 * Long) as fractions of the max tenure allowed for the product, itself
 * capped by the borrower's age so no loan runs past a documented max age.
 * Recommendation balances affordability against total cost rather than
 * always picking the lowest EMI.
 */
export function computeTenure(
  principal: number,
  fairRateMid: number,
  productType: ProductType,
  ageYears: number,
  safeEmiCeiling: number
): TenureOutput {
  const productMax = TENURE_RULES.MAX_TENURE_YEARS[productType] ?? 5;
  const ageCap = Math.max(1, TENURE_RULES.MAX_AGE_AT_LOAN_END - ageYears);
  const maxTenure = Math.min(productMax, ageCap);

  const short = Math.max(1, Math.round(maxTenure * TENURE_RULES.SHORT_FRACTION_OF_MAX));
  const balanced = Math.max(short, Math.round(maxTenure * TENURE_RULES.BALANCED_FRACTION_OF_MAX));
  const long = Math.max(balanced, Math.round(maxTenure * TENURE_RULES.LONG_FRACTION_OF_MAX));

  const build = (years: number) => ({
    years,
    emi: Math.round(calculateEMI(principal, fairRateMid, years)),
    totalInterest: Math.round(totalInterest(principal, fairRateMid, years)),
  });

  const options = [
    { label: 'Short' as const, ...build(short) },
    { label: 'Balanced' as const, ...build(balanced) },
    { label: 'Long' as const, ...build(long) },
  ];

  // Recommend the shortest tenure whose EMI still fits the safe ceiling;
  // if none fit, recommend Long (lowest EMI) and let the verdict/amount
  // outputs carry the "borrow less" message instead.
  const fitting = options.filter((o) => o.emi <= safeEmiCeiling);
  const recommended = fitting.length > 0 ? fitting[0].label : 'Long';

  return {
    options,
    recommended,
    explanation:
      recommended === 'Long'
        ? 'None of the shorter tenures keep the EMI within your safe ceiling at this amount, so the longest option is shown as the least-bad fit — consider reducing the amount instead.'
        : `The ${recommended.toLowerCase()} tenure keeps your EMI within your safe ceiling while minimising total interest paid — a longer tenure would lower the EMI further but cost meaningfully more overall.`,
    ruleRefs: ['TEN-01', 'TEN-02', 'TEN-03'],
  };
}
