import type { AprOutput } from './types';
import { APR_RULES } from './constants';
import { effectiveAnnualCostFromCashFlows } from '../utils/emi';

/**
 * APR-01/APR-02: computes the all-in illustrative APR from actual borrower
 * cash flows (disbursement net of processing fee, then EMIs), via
 * numerical IRR, then annualises it.
 *
 * IMPORTANT — three distinct numbers that are easy to conflate, all
 * surfaced separately in the UI and in RULES.md:
 *   1. Nominal annual rate — the quoted rate (e.g. "12% per annum"),
 *      typically applied monthly (1% per month) in EMI calculations.
 *   2. Effective annualised rate — what that nominal rate actually
 *      compounds to over a year: (1 + nominal/12)^12 - 1. For a 12%
 *      nominal rate this is ~12.68%, NOT 12%, purely due to monthly
 *      compounding. This is a mathematical fact, not a fee or a markup.
 *   3. All-in APR (what this function returns) — the effective annualised
 *      rate PLUS the impact of the upfront processing fee, since the
 *      borrower receives less than the full principal at disbursement but
 *      repays EMIs calculated on the full principal. This is the honest
 *      "what does this loan actually cost me" figure.
 *
 * This function deliberately does NOT force the zero-fee case back to the
 * nominal rate — that would be less accurate, not more.
 */
export function computeAPR(principal: number, nominalRatePct: number, years: number, processingFeePctOverride?: number): AprOutput {
  const processingFeePct = processingFeePctOverride ?? APR_RULES.DEFAULT_PROCESSING_FEE_PCT;
  const apr = effectiveAnnualCostFromCashFlows(principal, processingFeePct, nominalRatePct, years);

  const assumptions: string[] = [];
  if (processingFeePctOverride === undefined) {
    assumptions.push(
      `No specific processing fee was known for this quote, so an illustrative ${(processingFeePct * 100).toFixed(
        1
      )}% fee was assumed (my judgement) to show how fees affect all-in cost. Ask your lender for their actual fee.`
    );
  }

  return {
    value: apr,
    confidence: processingFeePctOverride === undefined ? 'Low' : 'Medium',
    explanation:
      'This all-in APR includes the effect of monthly compounding on the nominal rate AND the upfront processing fee — it is usually higher than the "interest rate" a lender quotes verbally, which is exactly why comparing loans by APR (not just the headline rate) matters.',
    ruleRefs: ['APR-01', 'APR-02'],
    assumptionsUsed: assumptions,
    processingFeePct,
    method: 'Effective annualised cost computed via numerical IRR of actual borrower cash flows (disbursement net of fee, then monthly EMIs), not a linear nominal+fee/tenure approximation.',
  };
}
