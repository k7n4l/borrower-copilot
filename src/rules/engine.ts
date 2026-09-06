import type { Answers, DecisionModel } from './types';
import { computeIncomeModel } from './income';
import { computeAffordability } from './affordability';
import { routeProduct } from './productRouting';
import { computeRateBand } from './rates';
import { computeAPR } from './apr';
import { computeAmount, emiAtRequestedAmount } from './amount';
import { computeVerdict } from './verdict';
import { computeTenure } from './tenure';
import { computeStress } from './stress';
import { computeOverallConfidence } from './confidence';
import { TENURE_RULES } from './constants';

/**
 * Single deterministic entry point. Every screen in the UI calls this and
 * renders its result — no financial calculation is ever duplicated in a
 * component. Given the same Answers, this always returns the same
 * DecisionModel (pure function, no randomness, no network, no ML).
 */
export function computeOutputs(a: Answers): DecisionModel {
  const income = computeIncomeModel(a);
  const affordability = computeAffordability(a, income);
  const productRouting = routeProduct(a);
  const productType = productRouting.value;
  const isSecuredRoute = ['loan_against_property', 'business_loan_secured', 'gold_loan', 'home_loan'].includes(
    productType
  );

  const rate = computeRateBand(a, productType);
  const fairRateMid = rate.value.central;

  // Standard tenure used for the amount<->EMI conversion and verdict gap
  // test: the "Balanced" tenure for this product/age, computed once here
  // so tenure.ts and amount.ts/verdict.ts all agree on the same figure.
  const productMaxTenure = TENURE_RULES.MAX_TENURE_YEARS[productType] ?? 5;
  const ageCapTenure = Math.max(1, TENURE_RULES.MAX_AGE_AT_LOAN_END - a.ageYears);
  const maxTenure = Math.min(productMaxTenure, ageCapTenure);
  const standardTenureYears = Math.max(1, Math.round(maxTenure * TENURE_RULES.BALANCED_FRACTION_OF_MAX));

  const amount = computeAmount(a, income, affordability, rate, productType, standardTenureYears);

  const verdict = computeVerdict(a, affordability, fairRateMid, standardTenureYears);

  const apr = computeAPR(a.amountWanted, fairRateMid, standardTenureYears);

  const tenure = computeTenure(
    amount.borrowerSafeAmount.value,
    fairRateMid,
    productType,
    a.ageYears,
    affordability.safeEmiCeiling.value
  );

  const requestedEmi = emiAtRequestedAmount(a, fairRateMid, standardTenureYears);
  const stress = computeStress(
    affordability.safeEmiCeiling.value,
    requestedEmi,
    productType,
    fairRateMid,
    a.amountWanted,
    standardTenureYears
  );

  const { confidence: overallConfidence, materialUnknowns } = computeOverallConfidence(a, isSecuredRoute);

  return {
    income,
    affordability,
    productRouting,
    verdict,
    amount,
    rate,
    apr,
    tenure,
    stress,
    overallConfidence,
    materialUnknowns,
  };
}
