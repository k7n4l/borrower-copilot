import type { AffordabilityModel, Answers, AmountOutput, IncomeModel, ProductType, RateOutput } from './types';
import { isUnknown } from './types';
import { maxPrincipalForEmi, calculateEMI } from '../utils/emi';
import { LENDER_AMOUNT_RULES, ROUTING_RULES } from './constants';
import { coApplicantContribution } from './income';

/**
 * O2: two genuinely different numbers.
 *
 * BORROWER-SAFE amount: the principal that keeps the EMI at or below the
 * safe EMI ceiling (from affordability.ts), using the FAIR rate midpoint
 * and a standard tenure. Uses the conservative reliable income throughout.
 *
 * LENDER-LIKELY amount: an illustrative estimate of what a typical lender
 * might sanction, using: the documented/lender-facing income (which for
 * self-employed borrowers is anchored to ITR, not the cash estimate), a
 * looser FOIR-style assumption (lenders often don't deduct full household
 * expenses the way our safe-side residual check does), and — for secured
 * products — capped by an LTV assumption against collateral value,
 * whichever is lower. This is explicitly labelled as NOT a guarantee.
 */
export function computeAmount(
  a: Answers,
  income: IncomeModel,
  affordability: AffordabilityModel,
  rate: RateOutput,
  productType: ProductType,
  tenureYears: number
): AmountOutput {
  const fairRateMid = rate.value.central;

  // --- Borrower-safe amount ---
  const safeCeiling = affordability.safeEmiCeiling.value;
  const safeAmountRaw = maxPrincipalForEmi(safeCeiling, fairRateMid, tenureYears);

  const safeAssumptions = [...affordability.safeEmiCeiling.assumptionsUsed];

  // --- Lender-likely amount ---
  // Looser FOIR proxy: lenders typically underwrite primarily off FOIR
  // against documented income, without deducting a borrower's full
  // household expense picture the way our safe-side residual check does.
  // My judgement / illustrative proxy, not a specific lender's formula.
  const lenderIncome =
    income.documentedMonthlyIncomeForLender.value + coApplicantContribution(a, 'lender').amount;
  const existingEMIForLender = isUnknown(a.existingMonthlyEMI)
    ? lenderIncome * LENDER_AMOUNT_RULES.UNKNOWN_EXISTING_EMI_PCT_OF_LENDER_INCOME
    : a.existingMonthlyEMI;
  const lenderEmiCapacity = Math.max(0, LENDER_AMOUNT_RULES.LOOSER_FOIR_PCT * lenderIncome - existingEMIForLender);
  let lenderAmountRaw = maxPrincipalForEmi(lenderEmiCapacity, fairRateMid, tenureYears);

  const lenderAssumptions: string[] = [
    'Lender-likely amount is an illustrative planning estimate using a looser, income-only affordability proxy — not an actual lender\'s formula or a guarantee of sanction.',
    `This estimate uses a ${Math.round(LENDER_AMOUNT_RULES.LOOSER_FOIR_PCT * 100)}% lender-facing FOIR proxy and, when your existing EMI is unknown, assumes ${Math.round(LENDER_AMOUNT_RULES.UNKNOWN_EXISTING_EMI_PCT_OF_LENDER_INCOME * 100)}% of lender-facing income for existing debt — both are planning judgements, not lender policy.`,
    ...income.documentedMonthlyIncomeForLender.assumptionsUsed,
  ];

  // LTV cap for secured products.
  if (!isUnknown(a.collateral) && a.collateral !== undefined && a.collateral.estimatedValue > 0) {
    const ltvCap = ROUTING_RULES.LTV_CEILING[productType];
    if (ltvCap) {
      const ltvAmount = a.collateral.estimatedValue * ltvCap;
      if (ltvAmount < lenderAmountRaw) {
        lenderAmountRaw = ltvAmount;
        lenderAssumptions.push(
          `Capped by an illustrative ${(ltvCap * 100).toFixed(0)}% loan-to-value assumption against the stated collateral value — actual LTV policy varies by lender and product.`
        );
      }
    }
  }

  const safeConfidence = affordability.safeEmiCeiling.confidence;
  const lenderConfidence = income.documentedMonthlyIncomeForLender.confidence === 'Low' ? 'Low' : 'Medium';

  return {
    borrowerSafeAmount: {
      value: Math.round(safeAmountRaw),
      range: affordability.safeEmiCeiling.range
        ? {
            low: Math.round(maxPrincipalForEmi(affordability.safeEmiCeiling.range.low, fairRateMid, tenureYears)),
            central: Math.round(safeAmountRaw),
            high: Math.round(maxPrincipalForEmi(affordability.safeEmiCeiling.range.high, fairRateMid, tenureYears)),
          }
        : undefined,
      confidence: safeConfidence,
      explanation:
        'This is the amount that keeps your EMI within your safe ceiling at a fair rate — the number you should actually use when deciding how much to borrow.',
      ruleRefs: ['AMT-SAFE-01'],
      assumptionsUsed: safeAssumptions,
    },
    lenderLikelyAmount: {
      value: Math.round(lenderAmountRaw),
      confidence: lenderConfidence,
      explanation:
        'This is an illustrative estimate of what a lender might be willing to sanction, which can be higher than what is actually safe for you to take on — use your safe amount, not this one, to decide how much to borrow.',
      ruleRefs: ['AMT-LENDER-01'],
      assumptionsUsed: lenderAssumptions,
    },
    assumedRate: fairRateMid,
    assumedTenureYears: tenureYears,
  };
}

/** Convenience re-export used by verdict.ts to compute the EMI at the requested amount. */
export function emiAtRequestedAmount(a: Answers, fairRateMid: number, tenureYears: number): number {
  return calculateEMI(a.amountWanted, fairRateMid, tenureYears);
}
