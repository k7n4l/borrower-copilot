import type { Answers, ProductType, RateOutput } from './types';
import { isUnknown } from './types';
import { RATE_BANDS, RATE_ADJUSTMENT_RULES, VERDICT_RULES } from './constants';

function baseBandKey(productType: ProductType, incomeSegment: Answers['incomeType']): string {
  if (productType === 'personal_loan') {
    return incomeSegment === 'salaried' ? 'personal_loan_strong_salaried' : 'personal_loan_thin_file';
  }
  if (productType === 'loan_against_property') return 'loan_against_property';
  if (productType === 'business_loan_secured') return 'business_loan_secured';
  if (productType === 'gold_loan') return 'gold_loan';
  if (productType === 'two_wheeler_loan') return 'two_wheeler_loan';
  if (productType === 'home_loan') return 'home_loan';
  return 'personal_loan_thin_file';
}

/**
 * RATE-01/RATE-02/RATE-03: builds a fair rate BAND (never a point) for the
 * borrower's routed product, then adjusts it for score, bounce history,
 * and stability. Unknown credit score widens the band and never defaults
 * to a punitive figure (RATE-01) — it must never be silently treated as a
 * bad score.
 */
export function computeRateBand(a: Answers, productType: ProductType): RateOutput {
  const key = baseBandKey(productType, a.incomeType);
  const band = RATE_BANDS[key];
  let low = band.low;
  let high = band.high;
  const ruleRefs: string[] = ['RATE-BAND'];
  const assumptions: string[] = [];
  let confidence: RateOutput['confidence'] = 'Medium';

  const scoreUnknown = a.creditScore === 'no_score' || isUnknown(a.creditScore);

  if (scoreUnknown) {
    const widen = RATE_ADJUSTMENT_RULES.UNKNOWN_SCORE_BAND_WIDEN_BPS / 10000;
    low += widen;
    high += widen;
    confidence = 'Low';
    assumptions.push(
      a.creditScore === 'no_score'
        ? 'No credit score / thin credit file: the band is widened rather than assumed to be a bad score, since an unknown score is not a 300.'
        : "Credit score wasn't provided: the band is widened rather than assumed to be a bad score."
    );
    ruleRefs.push('RATE-01');
  } else if (typeof a.creditScore === 'number' && a.creditScore >= RATE_ADJUSTMENT_RULES.STRONG_SCORE_THRESHOLD) {
    const tighten = RATE_ADJUSTMENT_RULES.STRONG_SCORE_SHIFT_BPS / 10000;
    low -= tighten;
    high -= tighten;
    confidence = 'High';
    ruleRefs.push('RATE-03');
  }

  if (!isUnknown(a.recentBounce) && a.recentBounce === true) {
    const bounceResolved = !isUnknown(a.bounceDetail) && a.bounceDetail?.resolved === true;
    if (!bounceResolved) {
      low += RATE_ADJUSTMENT_RULES.UNRESOLVED_BOUNCE_LOW_SHIFT_BPS / 10000;
      high += RATE_ADJUSTMENT_RULES.UNRESOLVED_BOUNCE_HIGH_SHIFT_BPS / 10000;
      confidence = 'Low';
      assumptions.push('A recent unresolved missed payment shifts the whole band higher, reflecting real near-term repayment risk.');
      ruleRefs.push('RATE-02');
    }
  }

  return {
    value: { low, central: (low + high) / 2, high },
    range: { low, central: (low + high) / 2, high },
    productType,
    confidence,
    explanation: `This is our planning estimate of what a fair rate looks like for your profile on a ${productType.replace(/_/g, ' ')}, not a specific lender's quote.`,
    ruleRefs,
    assumptionsUsed: assumptions,
  };
}

/** VER rationale reused here so rate-band text and verdict text stay consistent. */
export const RATE_MARGIN_NOTE = VERDICT_RULES.VERDICT_MARGIN_RATIONALE;
