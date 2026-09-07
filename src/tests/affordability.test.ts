import { describe, it, expect } from 'vitest';
import { computeIncomeModel, coApplicantContribution } from '../rules/income';
import { computeAffordability } from '../rules/affordability';
import { LENDER_AMOUNT_RULES } from '../rules/constants';
import type { Answers } from '../rules/types';

function baseAnswers(overrides: Partial<Answers>): Answers {
  return {
    purpose: 'other_consumption',
    amountWanted: 500_000,
    productHint: 'unspecified',
    incomeType: 'salaried',
    netMonthlyIncomeSalaried: 100_000,
    existingMonthlyEMI: 0,
    householdMonthlyExpenses: 40_000,
    ageYears: 30,
    creditScore: 750,
    recentBounce: false,
    hasCoApplicant: false,
    ...overrides,
  };
}

describe('computeIncomeModel', () => {
  it('rejects missing salaried income instead of converting it to zero', () => {
    const a = baseAnswers({ netMonthlyIncomeSalaried: 'unknown' });
    expect(() => computeIncomeModel(a)).toThrow(/known salaried monthly income is required/i);
  });

  it('rejects missing variable income instead of converting it to zero', () => {
    const a = baseAnswers({ incomeType: 'informal', monthlyIncomeRangeLow: 'unknown', monthlyIncomeRangeHigh: 'unknown' });
    expect(() => computeIncomeModel(a)).toThrow(/known monthly income range is required/i);
  });

  it('keeps explicit zero income distinct from missing income', () => {
    const a = baseAnswers({ netMonthlyIncomeSalaried: 0 });
    expect(computeIncomeModel(a).reliableMonthlyIncome.value).toBe(0);
  });

  it('salaried: reliable and lender-facing income are identical and equal stated net income', () => {
    const a = baseAnswers({ incomeType: 'salaried', netMonthlyIncomeSalaried: 110_000 });
    const income = computeIncomeModel(a);
    expect(income.reliableMonthlyIncome.value).toBe(110_000);
    expect(income.documentedMonthlyIncomeForLender.value).toBe(110_000);
    expect(income.reliableMonthlyIncome.confidence).toBe('High');
  });

  it('self-employed: reliable income uses the LOW end of the range, not an average', () => {
    const a = baseAnswers({
      incomeType: 'self_employed',
      monthlyIncomeRangeLow: 40_000,
      monthlyIncomeRangeHigh: 80_000,
      annualITRIncome: 420_000,
    });
    const income = computeIncomeModel(a);
    expect(income.reliableMonthlyIncome.value).toBe(40_000);
  });

  it('self-employed: lender-facing income anchors to ITR/12, which can be materially lower than the cash estimate (Ravi case)', () => {
    const a = baseAnswers({
      incomeType: 'self_employed',
      monthlyIncomeRangeLow: 40_000,
      monthlyIncomeRangeHigh: 80_000,
      annualITRIncome: 420_000,
    });
    const income = computeIncomeModel(a);
    expect(income.documentedMonthlyIncomeForLender.value).toBeCloseTo(35_000, 0);
    expect(income.documentedMonthlyIncomeForLender.value).toBeLessThan(income.reliableMonthlyIncome.value);
  });

  it('self-employed with unknown ITR: does not silently become 0, is flagged as an assumption and lowers confidence', () => {
    const a = baseAnswers({
      incomeType: 'self_employed',
      monthlyIncomeRangeLow: 40_000,
      monthlyIncomeRangeHigh: 80_000,
      annualITRIncome: 'unknown',
    });
    const income = computeIncomeModel(a);
    expect(income.documentedMonthlyIncomeForLender.value).toBeGreaterThan(0);
    expect(income.documentedMonthlyIncomeForLender.assumptionsUsed.length).toBeGreaterThan(0);
    expect(income.documentedMonthlyIncomeForLender.confidence).toBe('Low');
  });

  it('informal income uses the low end of the range for both reliable and lender-facing figures', () => {
    const a = baseAnswers({
      incomeType: 'informal',
      monthlyIncomeRangeLow: 26_000,
      monthlyIncomeRangeHigh: 30_000,
    });
    const income = computeIncomeModel(a);
    expect(income.reliableMonthlyIncome.value).toBe(26_000);
    expect(income.documentedMonthlyIncomeForLender.value).toBe(26_000);
  });
});

describe('coApplicantContribution', () => {
  it('contributes 0 if hasCoApplicant is false, even if income is provided elsewhere (never auto-assumed)', () => {
    const a = baseAnswers({ hasCoApplicant: false, coApplicantMonthlyIncome: 18_000 });
    const co = coApplicantContribution(a, 'safe');
    expect(co.amount).toBe(0);
  });

  it('applies the 60% safe-side recognition factor when explicitly confirmed', () => {
    const a = baseAnswers({ hasCoApplicant: true, coApplicantMonthlyIncome: 18_000 });
    const co = coApplicantContribution(a, 'safe');
    expect(co.amount).toBeCloseTo(10_800, 0);
  });

  it('applies a different (illustrative) 80% factor on the lender-likely side, and it is NOT equal to the safe-side amount', () => {
    const a = baseAnswers({ hasCoApplicant: true, coApplicantMonthlyIncome: 18_000 });
    const safe = coApplicantContribution(a, 'safe');
    const lender = coApplicantContribution(a, 'lender');
    expect(lender.amount).toBeCloseTo(14_400, 0);
    expect(lender.amount).not.toBeCloseTo(safe.amount, 0);
  });

  it('contributes 0 (not a guess) if co-applicant confirmed but their income is unknown, in both modes', () => {
    const a = baseAnswers({ hasCoApplicant: true, coApplicantMonthlyIncome: 'unknown' });
    expect(coApplicantContribution(a, 'safe').amount).toBe(0);
    expect(coApplicantContribution(a, 'lender').amount).toBe(0);
    expect(coApplicantContribution(a, 'safe').assumption).toBeDefined();
  });
});

describe('computeAffordability', () => {
  it('keeps lender amount assumptions centralized and explicit', () => {
    expect(LENDER_AMOUNT_RULES.LOOSER_FOIR_PCT).toBe(0.5);
    expect(LENDER_AMOUNT_RULES.UNKNOWN_EXISTING_EMI_PCT_OF_LENDER_INCOME).toBe(0.1);
  });
  it('higher income increases the safe EMI ceiling, all else equal', () => {
    const low = baseAnswers({ netMonthlyIncomeSalaried: 60_000 });
    const high = baseAnswers({ netMonthlyIncomeSalaried: 120_000 });
    const ceilingLow = computeAffordability(low, computeIncomeModel(low)).safeEmiCeiling.value;
    const ceilingHigh = computeAffordability(high, computeIncomeModel(high)).safeEmiCeiling.value;
    expect(ceilingHigh).toBeGreaterThan(ceilingLow);
  });

  it('higher existing EMI decreases the safe EMI ceiling, all else equal', () => {
    const noDebt = baseAnswers({ existingMonthlyEMI: 0 });
    const withDebt = baseAnswers({ existingMonthlyEMI: 20_000 });
    const c1 = computeAffordability(noDebt, computeIncomeModel(noDebt)).safeEmiCeiling.value;
    const c2 = computeAffordability(withDebt, computeIncomeModel(withDebt)).safeEmiCeiling.value;
    expect(c2).toBeLessThan(c1);
  });

  it('higher household expenses decrease the safe EMI ceiling, all else equal', () => {
    const lowExp = baseAnswers({ householdMonthlyExpenses: 20_000 });
    const highExp = baseAnswers({ householdMonthlyExpenses: 60_000 });
    const c1 = computeAffordability(lowExp, computeIncomeModel(lowExp)).safeEmiCeiling.value;
    const c2 = computeAffordability(highExp, computeIncomeModel(highExp)).safeEmiCeiling.value;
    expect(c2).toBeLessThan(c1);
  });

  it('unknown existing EMI does not behave like EMI=0 — it produces a LOWER or equal central ceiling than assuming 0 debt, never higher', () => {
    const knownZero = baseAnswers({ existingMonthlyEMI: 0 });
    const unknown = baseAnswers({ existingMonthlyEMI: 'unknown' });
    const cZero = computeAffordability(knownZero, computeIncomeModel(knownZero)).safeEmiCeiling.value;
    const cUnknown = computeAffordability(unknown, computeIncomeModel(unknown)).safeEmiCeiling.value;
    expect(cUnknown).toBeLessThanOrEqual(cZero);
  });

  it('unknown existing EMI produces a genuine range (low < central < high), not a single invented point, and the original answer is left as "unknown"', () => {
    const a = baseAnswers({ existingMonthlyEMI: 'unknown' });
    const result = computeAffordability(a, computeIncomeModel(a));
    expect(result.safeEmiCeiling.range).toBeDefined();
    expect(result.safeEmiCeiling.range!.low).toBeLessThanOrEqual(result.safeEmiCeiling.range!.central);
    expect(result.safeEmiCeiling.range!.central).toBeLessThanOrEqual(result.safeEmiCeiling.range!.high);
    expect(a.existingMonthlyEMI).toBe('unknown'); // original answer untouched
  });

  it('unknown household expenses lowers confidence to Medium or Low, never High', () => {
    const a = baseAnswers({ householdMonthlyExpenses: 'unknown' });
    const result = computeAffordability(a, computeIncomeModel(a));
    expect(['Medium', 'Low']).toContain(result.safeEmiCeiling.confidence);
  });

  it('multiple material unknowns push confidence to Low', () => {
    const a = baseAnswers({ existingMonthlyEMI: 'unknown', householdMonthlyExpenses: 'unknown' });
    const result = computeAffordability(a, computeIncomeModel(a));
    expect(result.safeEmiCeiling.confidence).toBe('Low');
  });

  it('safe EMI ceiling is never negative', () => {
    const a = baseAnswers({
      incomeType: 'informal',
      monthlyIncomeRangeLow: 26_000,
      monthlyIncomeRangeHigh: 30_000,
      existingMonthlyEMI: 35_000, // exceeds income
      householdMonthlyExpenses: 18_000,
    });
    const result = computeAffordability(a, computeIncomeModel(a));
    expect(result.safeEmiCeiling.value).toBeGreaterThanOrEqual(0);
  });
});
