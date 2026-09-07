import type { Answers, IncomeModel, RuleOutput } from './types';
import { isUnknown } from './types';
import { INCOME_RULES } from './constants';

/**
 * Computes two separate income figures per RULES.md INC-01..INC-05:
 *
 * - reliableMonthlyIncome: the conservative figure used for BORROWER-SAFE
 *   calculations (affordability, safe amount, safe EMI ceiling).
 * - documentedMonthlyIncomeForLender: the figure a lender could actually
 *   verify, used for the LENDER-LIKELY estimate. For salaried borrowers
 *   these are the same number; for self-employed borrowers they
 *   deliberately diverge (cash estimate vs. ITR), which is exactly the
 *   mechanism that makes the safe-vs-lender-likely gap meaningful for
 *   someone like Ravi.
 */
export function computeIncomeModel(a: Answers): IncomeModel {
  const assumptions: string[] = [];

  if (a.incomeType === 'salaried') {
    if (isUnknown(a.netMonthlyIncomeSalaried) || a.netMonthlyIncomeSalaried === undefined) {
      throw new Error('A known salaried monthly income is required before financial outputs can be calculated.');
    }
    const income = a.netMonthlyIncomeSalaried;
    const reliable: RuleOutput<number> = {
      value: income,
      confidence: 'High',
      explanation: 'Your reliable monthly income is your stated net take-home pay.',
      ruleRefs: ['INC-01'],
      assumptionsUsed: [],
    };
    const forLender: RuleOutput<number> = {
      value: income,
      confidence: 'High',
      explanation: 'A lender can typically verify salaried income directly from payslips/bank statements.',
      ruleRefs: ['INC-01'],
      assumptionsUsed: [],
    };
    return { reliableMonthlyIncome: reliable, documentedMonthlyIncomeForLender: forLender, segment: 'salaried' };
  }

  // Self-employed and informal both use the low end of the stated range for
  // the BORROWER-SAFE figure (INC-01 / INC-02), and diverge on the
  // LENDER-LIKELY anchor.
  if (
    isUnknown(a.monthlyIncomeRangeLow) ||
    a.monthlyIncomeRangeLow === undefined ||
    isUnknown(a.monthlyIncomeRangeHigh) ||
    a.monthlyIncomeRangeHigh === undefined
  ) {
    throw new Error('Known monthly income range is required before financial outputs can be calculated.');
  }
  const low = a.monthlyIncomeRangeLow;
  const high = a.monthlyIncomeRangeHigh;
  const reliableValue = low; // conservative: low end, not a midpoint blend

  const reliable: RuleOutput<number> = {
    value: reliableValue,
    confidence: low === high ? 'Medium' : 'Medium',
    explanation:
      a.incomeType === 'self_employed'
        ? 'Your income varies month to month, so we use the lower end of the range you gave us to plan safely, not an average.'
        : 'Your income varies month to month, so we use the lower end of the range you gave us to plan safely, not the higher months.',
    ruleRefs: [a.incomeType === 'self_employed' ? 'INC-01' : 'INC-02'],
    assumptionsUsed: assumptions,
  };

  let forLenderValue: number;
  let forLenderExplanation: string;
  const lenderAssumptions: string[] = [];

  if (a.incomeType === 'self_employed') {
    if (!isUnknown(a.annualITRIncome) && a.annualITRIncome !== undefined) {
      forLenderValue = a.annualITRIncome / 12;
      forLenderExplanation =
        'A lender typically underwrites against your documented (ITR) income, not your cash estimate, because that is what they can verify.';
    } else {
      // ITR unknown — do not silently treat as 0. Fall back to a heavily
      // discounted version of the borrower's own low estimate and flag it.
      forLenderValue = reliableValue * 0.7;
      forLenderExplanation =
        'Your ITR income was not provided, so we cannot show what a lender would verify. We show a heavily discounted planning estimate instead — treat the lender-likely figure as especially uncertain until you provide your ITR.';
      lenderAssumptions.push(
        'ITR/documented income unknown: lender-likely income estimated as 70% of your stated low-end cash income, purely as a placeholder — not a claim about actual lender underwriting.'
      );
    }
  } else {
    // Informal income has no ITR concept in this product; lender-likely
    // uses the same conservative reliable figure, since there is no
    // separate documented-income channel to anchor to.
    forLenderValue = reliableValue;
    forLenderExplanation =
      'Informal income is not usually documentable, so we use the same conservative figure for both your safe planning and what a lender might consider.';
  }

  const forLender: RuleOutput<number> = {
    value: forLenderValue,
    confidence: lenderAssumptions.length > 0 ? 'Low' : 'Medium',
    explanation: forLenderExplanation,
    ruleRefs: ['INC-03'],
    assumptionsUsed: lenderAssumptions,
  };

  return {
    reliableMonthlyIncome: reliable,
    documentedMonthlyIncomeForLender: forLender,
    segment: a.incomeType,
  };
}

/**
 * INC-04 / INC-05a / INC-05b: co-applicant income is NEVER added
 * automatically — only if the borrower explicitly confirms
 * `hasCoApplicant === true`. Even then, we apply a partial recognition
 * factor, and — importantly — we use a DIFFERENT factor depending on
 * whether this is feeding the borrower-safe calculation (conservative,
 * our own planning caution) or the lender-likely calculation (illustrative
 * proxy for how a lender might view combined repayment capacity). These
 * are deliberately kept separate: real lenders vary enormously in how
 * much of a co-applicant's income they recognise, and collapsing both
 * into one number would imply a precision neither side actually has.
 *
 * The borrower's original answer for coApplicantMonthlyIncome is never
 * mutated here — if it is 'unknown', this function contributes ₹0 and
 * says so, rather than guessing a figure.
 */
export function coApplicantContribution(
  a: Answers,
  mode: 'safe' | 'lender'
): { amount: number; ruleRefs: string[]; assumption?: string } {
  if (!a.hasCoApplicant) {
    return { amount: 0, ruleRefs: ['INC-04'] };
  }
  if (isUnknown(a.coApplicantMonthlyIncome) || a.coApplicantMonthlyIncome === undefined) {
    return {
      amount: 0,
      ruleRefs: ['INC-04'],
      assumption:
        'Co-applicant confirmed but their income was not provided — treated as unknown, contributes ₹0 rather than being guessed.',
    };
  }
  const factor =
    mode === 'safe'
      ? INCOME_RULES.SAFE_COAPPLICANT_RECOGNITION_FACTOR
      : INCOME_RULES.LENDER_LIKELY_COAPPLICANT_RECOGNITION_FACTOR;
  return {
    amount: a.coApplicantMonthlyIncome * factor,
    ruleRefs: mode === 'safe' ? ['INC-04', 'INC-05a'] : ['INC-04', 'INC-05b'],
  };
}
