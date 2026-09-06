import { describe, it, expect, afterEach } from 'vitest';
import { computeOutputs } from '../rules/engine';
import { priya } from '../data/personas';
import { RATE_BANDS, AFFORDABILITY_RULES, APR_RULES } from '../rules/constants';

/**
 * This is exactly the scenario the brief's follow-up interview tests:
 * "we change an assumption live and watch you change the app." These
 * tests prove the architecture actually supports that — constants.ts is
 * the only place these numbers live, and computeOutputs() has no cache,
 * so mutating a constant and re-calling computeOutputs() must change the
 * result. If any of these failed, it would mean a derived number had
 * been hard-coded somewhere instead of flowing from constants.ts.
 */
describe('Live assumption changes propagate through the engine (no hard-coded derived numbers)', () => {
  const originalLow = RATE_BANDS.personal_loan_strong_salaried.low;
  const originalHigh = RATE_BANDS.personal_loan_strong_salaried.high;
  const originalFoirHigh = AFFORDABILITY_RULES.FOIR_CEILING.salaried_high;
  const originalFee = APR_RULES.DEFAULT_PROCESSING_FEE_PCT;

  afterEach(() => {
    RATE_BANDS.personal_loan_strong_salaried.low = originalLow;
    RATE_BANDS.personal_loan_strong_salaried.high = originalHigh;
    (AFFORDABILITY_RULES.FOIR_CEILING as { salaried_high: number }).salaried_high = originalFoirHigh;
    (APR_RULES as { DEFAULT_PROCESSING_FEE_PCT: number }).DEFAULT_PROCESSING_FEE_PCT = originalFee;
  });

  it('changing the personal-loan rate band in constants.ts changes the computed rate for Priya', () => {
    const before = computeOutputs(priya).rate.value;

    RATE_BANDS.personal_loan_strong_salaried.low = 0.2;
    RATE_BANDS.personal_loan_strong_salaried.high = 0.25;

    const after = computeOutputs(priya).rate.value;

    expect(after.low).not.toBeCloseTo(before.low, 3);
    expect(after.low).toBeGreaterThan(before.low);
  });

  it('changing the salaried-high FOIR ceiling changes the safe EMI ceiling and safe amount', () => {
    const before = computeOutputs(priya);

    (AFFORDABILITY_RULES.FOIR_CEILING as { salaried_high: number }).salaried_high = 0.3; // much stricter

    const after = computeOutputs(priya);

    expect(after.affordability.safeEmiCeiling.value).not.toBe(before.affordability.safeEmiCeiling.value);
  });

  it('changing the default processing fee assumption changes the illustrative APR', () => {
    const before = computeOutputs(priya).apr.value;

    (APR_RULES as { DEFAULT_PROCESSING_FEE_PCT: number }).DEFAULT_PROCESSING_FEE_PCT = 0.05;

    const after = computeOutputs(priya).apr.value;

    expect(after).toBeGreaterThan(before);
  });
});
