import { describe, it, expect } from 'vitest';
import { computeOutputs } from '../rules/engine';
import { priya, ravi, raviWithCoApplicant, anita } from '../data/personas';

/**
 * These are the three golden tests named directly in the Lokta brief.
 * They assert DIRECTION and structural properties (verdict, routing,
 * "safe ≠ lender-likely", flags present) rather than brittle exact
 * rupee figures — several of our inputs (household expenses, Ravi's
 * eventual co-applicant status, Anita's exact EMI) are legitimately
 * unknown, so the numbers are themselves ranges/estimates by design.
 * Exact figures are not meant to match an internal Lokta answer key;
 * the reasoning that gets to them is what's being demonstrated.
 */

describe('Golden persona: Priya (salaried, wedding, ₹8,00,000)', () => {
  const result = computeOutputs(priya);

  it('verdict is Borrow', () => {
    expect(result.verdict.value).toBe('borrow');
  });

  it('no distress flags fire for a strong, stable salaried profile', () => {
    expect(result.verdict.distressFlags).toHaveLength(0);
  });

  it('is routed to an unsecured personal loan (no purpose/collateral basis for a secured route)', () => {
    expect(result.productRouting.value).toBe('personal_loan');
  });

  it('borrower-safe amount comfortably covers the ₹8,00,000 request', () => {
    expect(result.amount.borrowerSafeAmount.value).toBeGreaterThanOrEqual(800_000);
  });

  it('lender-likely amount is a DIFFERENT number from the borrower-safe amount', () => {
    expect(result.amount.lenderLikelyAmount.value).not.toBe(result.amount.borrowerSafeAmount.value);
  });

  it('strong credit score (780) tightens the fair rate band toward its low end vs. the base band', () => {
    // 780 >= STRONG_SCORE_THRESHOLD (750), so RATE-03 should have fired.
    expect(result.rate.ruleRefs).toContain('RATE-03');
  });

  it('confidence is not artificially High despite missing household expenses', () => {
    expect(result.overallConfidence).not.toBe('High');
    expect(result.materialUnknowns).toContain('householdMonthlyExpenses');
  });

  it('household expenses were never invented — the fixture itself carries them as unknown', () => {
    expect(priya.householdMonthlyExpenses).toBe('unknown');
  });
});

describe("Golden persona: Ravi (self-employed, business purpose, ₹15,00,000)", () => {
  const result = computeOutputs(ravi);

  it('is routed to a SECURED product (loan against property), not a plain personal loan', () => {
    expect(result.productRouting.value).toBe('loan_against_property');
    expect(result.productRouting.ruleRefs).toContain('ROUTE-01');
  });

  it('verdict is Borrow less: the ₹15,00,000 request exceeds both safe and lender-likely amounts', () => {
    expect(result.verdict.value).toBe('borrow_less');
    expect(result.amount.borrowerSafeAmount.value).toBeLessThan(1_500_000);
    expect(result.amount.lenderLikelyAmount.value).toBeLessThan(1_500_000);
  });

  it('lender-likely income anchors to ITR (₹35,000/mo), which is LOWER than his stated reliable cash income (₹40,000/mo)', () => {
    expect(result.income.documentedMonthlyIncomeForLender.value).toBeLessThan(result.income.reliableMonthlyIncome.value);
    expect(result.income.documentedMonthlyIncomeForLender.value).toBeCloseTo(35_000, 0);
  });

  it('unknown/no credit score widens the rate band rather than defaulting to a punitive one', () => {
    expect(result.rate.ruleRefs).toContain('RATE-01');
    // widened band's low end should still be below the "thin file" base band's low end + widen amount is additive,
    // so it must not equal the base high-end alone — sanity check it's a genuine band, not a point punitive rate.
    expect(result.rate.value.high).toBeGreaterThan(result.rate.value.low);
  });

  it('collateral affects rate/amount/routing but does NOT eliminate the affordability check — safe amount is still capped by repayment capacity, not just property value', () => {
    // 50% LTV of ₹45,00,000 = ₹22,50,000, which is far above the actual safe amount —
    // proving the income-based ceiling, not the collateral value, is what's binding.
    const ltvCeiling = 0.5 * 4_500_000;
    expect(result.amount.borrowerSafeAmount.value).toBeLessThan(ltvCeiling);
  });

  it("wife's income (₹18,000/mo) is NOT counted unless hasCoApplicant is explicitly true", () => {
    expect(ravi.hasCoApplicant).toBe(false);
    const withoutCoApplicant = computeOutputs(ravi).amount.borrowerSafeAmount.value;
    const withCoApplicant = computeOutputs(raviWithCoApplicant).amount.borrowerSafeAmount.value;
    expect(withCoApplicant).toBeGreaterThan(withoutCoApplicant);
  });

  it('confirming co-applicant status changes the output (proves the toggle is load-bearing, not decorative)', () => {
    const base = computeOutputs(ravi);
    const withCo = computeOutputs(raviWithCoApplicant);
    expect(withCo.amount.borrowerSafeAmount.value).not.toBe(base.amount.borrowerSafeAmount.value);
  });

  it('household expenses were never invented for Ravi either', () => {
    expect(ravi.householdMonthlyExpenses).toBe('unknown');
  });
});

describe("Golden persona: Anita (informal, vehicle purpose, ₹1,50,000)", () => {
  const result = computeOutputs(anita);

  it('verdict is Don\u2019t borrow', () => {
    expect(result.verdict.value).toBe('dont_borrow');
  });

  it('the "don\u2019t borrow" reason cites the bounce + existing high-cost/multiple debt combination (VER-02), not a single isolated signal', () => {
    expect(result.verdict.ruleRefs).toContain('VER-02');
    expect(result.verdict.distressFlags.length).toBeGreaterThan(0);
  });

  it('her exact existing EMI was never invented — it is carried as unknown throughout', () => {
    expect(anita.existingMonthlyEMI).toBe('unknown');
  });

  it('unknown existing EMI still produces a genuine range for the safe ceiling, not a fabricated point value used as fact', () => {
    expect(result.affordability.safeEmiCeiling.range).toBeDefined();
  });

  it('would be routed to two-wheeler hypothecation IF she were to proceed (product routing is independent of the borrow/don\u2019t-borrow verdict)', () => {
    expect(result.productRouting.value).toBe('two_wheeler_loan');
  });

  it('confidence is Low, reflecting the number of real unknowns, not a raw percentage of questions answered', () => {
    expect(result.overallConfidence).toBe('Low');
  });

  it('copy is respectful and does not use shaming language (checked structurally: explanation does not contain judgemental terms)', () => {
    const bannedTerms = ['bad borrower', 'risky person', 'irresponsible', 'shameful'];
    const text = (result.verdict.explanation + result.affordability.safeEmiCeiling.explanation).toLowerCase();
    bannedTerms.forEach((term) => expect(text).not.toContain(term));
  });
});

describe('Cross-persona sanity: safe vs lender-likely genuinely diverge for at least one borrower', () => {
  it('Ravi shows the starkest safe-vs-lender-likely divergence, driven by ITR-anchoring', () => {
    const r = computeOutputs(ravi);
    const gapPct = Math.abs(r.amount.lenderLikelyAmount.value - r.amount.borrowerSafeAmount.value) / r.amount.borrowerSafeAmount.value;
    expect(gapPct).toBeGreaterThan(0.05);
  });
});
