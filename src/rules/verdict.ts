import type { AffordabilityModel, Answers, VerdictOutput } from './types';
import { isUnknown } from './types';
import { VERDICT_RULES } from './constants';
import { emiAtRequestedAmount } from './amount';

/**
 * O1: Borrow / Borrow less / Don't borrow.
 *
 * VER-01: hard "Don't borrow" if the safe EMI ceiling is non-positive.
 * VER-02: hard "Don't borrow" (or strong caution) if there's an
 *   unresolved recent bounce AND existing high-cost debt — a materially
 *   different, more urgent combination than either signal alone.
 * VER-03: otherwise, compare the EMI at the requested amount (fair-rate
 *   midpoint, standard tenure) against the safe ceiling; a gap beyond
 *   the documented margin (VER-03/VER-04) → Borrow less.
 * VER-05: a single isolated negative signal never forces "Don't borrow"
 *   on its own — only the ceiling test or the VER-02 combination do.
 */
export function computeVerdict(
  a: Answers,
  affordability: AffordabilityModel,
  fairRateMid: number,
  tenureYears: number
): VerdictOutput {
  const flags: string[] = [];
  const ceiling = affordability.safeEmiCeiling.value;

  // VER-01
  if (ceiling <= 0) {
    flags.push('Your safe EMI ceiling is at or below zero given your current income, expenses, and existing debt.');
    return {
      value: 'dont_borrow',
      confidence: affordability.safeEmiCeiling.confidence,
      explanation: 'Based on what you\u2019ve told us, there isn\u2019t safe room in your monthly budget for a new EMI right now.',
      ruleRefs: ['VER-01'],
      assumptionsUsed: affordability.safeEmiCeiling.assumptionsUsed,
      distressFlags: flags,
    };
  }

  // VER-02: unresolved recent bounce + existing high-cost debt.
  const hasUnresolvedBounce = !isUnknown(a.recentBounce) && a.recentBounce === true &&
    !(!isUnknown(a.bounceDetail) && a.bounceDetail?.resolved === true);
  const hasHighCostDebt =
    !isUnknown(a.existingLoanDetail) &&
    a.existingLoanDetail !== undefined &&
    !isUnknown(a.existingLoanDetail.highestRateApprox) &&
    (a.existingLoanDetail.highestRateApprox as number) >= VERDICT_RULES.HIGH_COST_DEBT_RATE_THRESHOLD;

  // Even without exact rate detail, three-plus active informal/app loans
  // combined with a bounce is treated as the same distress signature —
  // this is what makes Anita's case reachable without inventing her
  // exact EMI figure.
  const hasMultipleActiveLoans =
    !isUnknown(a.existingLoanDetail) && a.existingLoanDetail !== undefined && a.existingLoanDetail.count >= 3;

  if (hasUnresolvedBounce && (hasHighCostDebt || hasMultipleActiveLoans)) {
    flags.push('You have a recent unresolved missed payment alongside existing high-cost or multiple active debts — a sign of active repayment stress.');
    return {
      value: 'dont_borrow',
      confidence: 'Medium',
      explanation:
        'Taking on a new loan while an existing payment is already behind and other high-cost debt is outstanding is not currently borrower-safe, even if the new loan itself could be useful.',
      ruleRefs: ['VER-02'],
      assumptionsUsed: [],
      distressFlags: flags,
    };
  }

  // VER-05: a single isolated signal (unresolved bounce alone, or
  // high-cost debt alone, or unknown score alone) does not by itself
  // force "Don't borrow" — it's handled instead via the rate/amount
  // adjustments and a caution note.
  if (hasUnresolvedBounce) {
    flags.push('You have a recent missed payment. This does not by itself rule out borrowing, but it raises your fair-rate band and lowers confidence.');
  }

  // VER-03: gap test.
  const requestedEmi = emiAtRequestedAmount(a, fairRateMid, tenureYears);
  const gap = (requestedEmi - ceiling) / Math.max(ceiling, 1);

  if (gap > VERDICT_RULES.BORROW_LESS_MARGIN_PCT) {
    return {
      value: 'borrow_less',
      confidence: affordability.safeEmiCeiling.confidence,
      explanation: `The amount you're asking for would need an EMI of about ₹${Math.round(
        requestedEmi
      ).toLocaleString('en-IN')}/month, which is more than your safe ceiling of about ₹${ceiling.toLocaleString(
        'en-IN'
      )}/month — a smaller amount or longer tenure would fit better.`,
      ruleRefs: ['VER-03'],
      assumptionsUsed: affordability.safeEmiCeiling.assumptionsUsed,
      distressFlags: flags,
    };
  }

  return {
    value: 'borrow',
    confidence: affordability.safeEmiCeiling.confidence,
    explanation: 'The amount you\u2019re asking for fits within your safe monthly budget at a fair rate, and there\u2019s no major repayment-risk flag.',
    ruleRefs: ['VER-03'],
    assumptionsUsed: affordability.safeEmiCeiling.assumptionsUsed,
    distressFlags: flags,
  };
}
