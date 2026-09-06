import { describe, it, expect } from 'vitest';
import { calculateEMI, maxPrincipalForEmi, totalInterest, effectiveAnnualCostFromCashFlows } from '../utils/emi';

describe('calculateEMI', () => {
  it('matches a known reference EMI (₹1,00,000 at 12% for 1 year ≈ ₹8,884.88)', () => {
    const emi = calculateEMI(100_000, 0.12, 1);
    expect(emi).toBeCloseTo(8884.88, 1);
  });

  it('increases with rate, holding principal and tenure constant', () => {
    const lower = calculateEMI(500_000, 0.10, 5);
    const higher = calculateEMI(500_000, 0.15, 5);
    expect(higher).toBeGreaterThan(lower);
  });

  it('decreases with longer tenure, holding principal and rate constant', () => {
    const shortTenure = calculateEMI(500_000, 0.12, 3);
    const longTenure = calculateEMI(500_000, 0.12, 6);
    expect(longTenure).toBeLessThan(shortTenure);
  });

  it('returns 0 for non-positive principal or tenure', () => {
    expect(calculateEMI(0, 0.12, 5)).toBe(0);
    expect(calculateEMI(100_000, 0.12, 0)).toBe(0);
  });

  it('handles a zero interest rate as a simple division', () => {
    const emi = calculateEMI(120_000, 0, 1);
    expect(emi).toBeCloseTo(10_000, 2);
  });
});

describe('maxPrincipalForEmi (inverse of calculateEMI)', () => {
  it('round-trips: EMI(maxPrincipalForEmi(x)) ≈ x', () => {
    const targetEmi = 20_000;
    const rate = 0.115;
    const years = 4;
    const principal = maxPrincipalForEmi(targetEmi, rate, years);
    const backOut = calculateEMI(principal, rate, years);
    expect(backOut).toBeCloseTo(targetEmi, 1);
  });

  it('returns 0 for non-positive EMI', () => {
    expect(maxPrincipalForEmi(0, 0.12, 5)).toBe(0);
  });
});

describe('totalInterest', () => {
  it('is positive and less than a naive EMI*months for reducing balance loans', () => {
    const principal = 500_000;
    const rate = 0.11;
    const years = 5;
    const interest = totalInterest(principal, rate, years);
    expect(interest).toBeGreaterThan(0);
    // sanity: total repayment should exceed principal by roughly reasonable interest
    expect(interest).toBeLessThan(principal); // for these params, true
  });
});

describe('effectiveAnnualCostFromCashFlows (APR via IRR)', () => {
  it('produces an APR strictly greater than the nominal rate when a fee is charged', () => {
    const nominal = 0.12;
    const apr = effectiveAnnualCostFromCashFlows(500_000, 0.02, nominal, 4);
    expect(apr).toBeGreaterThan(nominal);
  });

  it('with zero fee, equals the effective annual rate of the nominal monthly-compounded rate (NOT the nominal rate itself — this is correct: (1+0.12/12)^12 - 1 ≈ 12.68%)', () => {
    const nominal = 0.12;
    const apr = effectiveAnnualCostFromCashFlows(500_000, 0, nominal, 4);
    const expectedEffectiveAnnualRate = Math.pow(1 + nominal / 12, 12) - 1;
    expect(apr).toBeCloseTo(expectedEffectiveAnnualRate, 3);
  });

  it('a higher fee produces a higher APR, holding rate and tenure constant', () => {
    const lowFeeApr = effectiveAnnualCostFromCashFlows(500_000, 0.01, 0.12, 4);
    const highFeeApr = effectiveAnnualCostFromCashFlows(500_000, 0.03, 0.12, 4);
    expect(highFeeApr).toBeGreaterThan(lowFeeApr);
  });

  it('a longer tenure dilutes the fee impact, lowering the APR premium over nominal', () => {
    const shortTenurePremium =
      effectiveAnnualCostFromCashFlows(500_000, 0.02, 0.12, 2) - 0.12;
    const longTenurePremium =
      effectiveAnnualCostFromCashFlows(500_000, 0.02, 0.12, 8) - 0.12;
    expect(shortTenurePremium).toBeGreaterThan(longTenurePremium);
  });
});
