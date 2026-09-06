import type { Answers, AffordabilityModel, IncomeModel } from './types';
import { isUnknown } from './types';
import { AFFORDABILITY_RULES } from './constants';
import { coApplicantContribution } from './income';

function foirCeilingPct(income: IncomeModel, reliableIncome: number): number {
  const F = AFFORDABILITY_RULES.FOIR_CEILING;
  if (income.segment === 'salaried') {
    if (reliableIncome < AFFORDABILITY_RULES.FOIR_SALARIED_LOW_THRESHOLD) return F.salaried_low;
    if (reliableIncome < AFFORDABILITY_RULES.FOIR_SALARIED_HIGH_THRESHOLD) return F.salaried_mid;
    return F.salaried_high;
  }
  if (income.segment === 'self_employed') return F.self_employed;
  return F.informal;
}

function computeCeilingFor(
  effectiveIncome: number,
  existingEMI: number,
  householdExpenses: number,
  foirPct: number
): { ceiling: number; binding: AffordabilityModel['bindingConstraint'] } {
  const foirCeiling = Math.max(0, foirPct * effectiveIncome - existingEMI);
  const buffer = AFFORDABILITY_RULES.RESIDUAL_SAFETY_BUFFER_PCT_OF_INCOME * effectiveIncome;
  const residualCeiling = Math.max(0, effectiveIncome - householdExpenses - existingEMI - buffer);
  const ceiling = Math.min(foirCeiling, residualCeiling);
  const binding: AffordabilityModel['bindingConstraint'] =
    Math.abs(foirCeiling - residualCeiling) < 1 ? 'both_equal' : foirCeiling < residualCeiling ? 'foir' : 'residual';
  return { ceiling, binding };
}

/**
 * AFF-01/AFF-02/AFF-03: computes the safe EMI ceiling as the stricter of a
 * FOIR-based ceiling and a residual-income-based ceiling.
 *
 * AFF-04/AFF-05: existing EMI and household expenses are Unknown<number>.
 * When unknown, we NEVER treat them as 0 (that overstates affordability —
 * the unsafe direction) and we never invent a single precise figure
 * either. Instead we compute the ceiling three times — using the low,
 * central, and high ends of a documented planning RANGE for the missing
 * input — and surface all three as a genuine RangeValue. The borrower's
 * original answer stays 'unknown' in the Answers object; only these
 * internal calculations use the range, and every user-facing explanation
 * says explicitly that this is an assumption, not the borrower's real
 * figure.
 */
export function computeAffordability(a: Answers, income: IncomeModel): AffordabilityModel {
  const reliableIncome = income.reliableMonthlyIncome.value;
  const co = coApplicantContribution(a, 'safe');
  const effectiveIncome = reliableIncome + co.amount;

  const assumptions: string[] = [...income.reliableMonthlyIncome.assumptionsUsed];
  if (co.assumption) assumptions.push(co.assumption);

  const foirPct = foirCeilingPct(income, reliableIncome);

  const emiUnknown = isUnknown(a.existingMonthlyEMI);
  const expensesUnknown = isUnknown(a.householdMonthlyExpenses);

  if (!emiUnknown && !expensesUnknown) {
    const existingEMI = a.existingMonthlyEMI as number;
    const householdExpenses = a.householdMonthlyExpenses as number;
    const { ceiling, binding } = computeCeilingFor(effectiveIncome, existingEMI, householdExpenses, foirPct);
    return {
      safeEmiCeiling: {
        value: Math.round(ceiling),
        confidence: assumptions.length === 0 ? 'High' : 'Medium',
        explanation:
          binding === 'residual'
            ? 'Your safe monthly EMI ceiling is limited by your living expenses and existing debt, not just by an income formula.'
            : binding === 'foir'
            ? 'Your safe monthly EMI ceiling is limited by keeping your total debt payments to a sustainable share of your income.'
            : 'Your income-based and expense-based limits work out to about the same ceiling.',
        ruleRefs: ['AFF-01', 'AFF-02', 'AFF-03'],
        assumptionsUsed: assumptions,
      },
      bindingConstraint: binding,
    };
  }

  const EMI_RANGE = AFFORDABILITY_RULES.UNKNOWN_EXISTING_EMI_PLACEHOLDER_RANGE_PCT_OF_INCOME;
  const EXP_RANGE = AFFORDABILITY_RULES.UNKNOWN_HOUSEHOLD_EXPENSES_PLACEHOLDER_RANGE_PCT_OF_INCOME;

  const emiLow = emiUnknown ? effectiveIncome * EMI_RANGE.low : (a.existingMonthlyEMI as number);
  const emiCentral = emiUnknown ? effectiveIncome * EMI_RANGE.central : (a.existingMonthlyEMI as number);
  const emiHigh = emiUnknown ? effectiveIncome * EMI_RANGE.high : (a.existingMonthlyEMI as number);

  const expLow = expensesUnknown ? effectiveIncome * EXP_RANGE.low : (a.householdMonthlyExpenses as number);
  const expCentral = expensesUnknown ? effectiveIncome * EXP_RANGE.central : (a.householdMonthlyExpenses as number);
  const expHigh = expensesUnknown ? effectiveIncome * EXP_RANGE.high : (a.householdMonthlyExpenses as number);

  // Convention kept consistent with the rest of the app: range.low is
  // always the more cautious/lower figure. So range.low uses the HIGH
  // (worst-case) burden assumptions, and range.high uses the LOW
  // (best-case) burden assumptions.
  const centralResult = computeCeilingFor(effectiveIncome, emiCentral, expCentral, foirPct);
  const conservativeResult = computeCeilingFor(effectiveIncome, emiHigh, expHigh, foirPct);
  const optimisticResult = computeCeilingFor(effectiveIncome, emiLow, expLow, foirPct);

  const rangeAssumptions = [...assumptions];
  if (emiUnknown) {
    rangeAssumptions.push(
      `Existing monthly EMI was not provided. This is not treated as \u20b90 \u2014 we planned using a range of ${Math.round(
        EMI_RANGE.low * 100
      )}%-${Math.round(EMI_RANGE.high * 100)}% of your income as a plausible undisclosed debt burden (my judgement, not your actual EMI). Your real figure would sharpen this considerably.`
    );
  }
  if (expensesUnknown) {
    rangeAssumptions.push(
      `Household expenses were not provided. This is not treated as \u20b90 \u2014 we planned using a range of ${Math.round(
        EXP_RANGE.low * 100
      )}%-${Math.round(EXP_RANGE.high * 100)}% of your income as a plausible living-cost burden (my judgement, not your actual expenses). Your real figure would sharpen this considerably.`
    );
  }

  const materialUnknownCount = (emiUnknown ? 1 : 0) + (expensesUnknown ? 1 : 0) + (co.assumption ? 1 : 0);
  const confidence = materialUnknownCount === 0 ? 'High' : materialUnknownCount === 1 ? 'Medium' : 'Low';

  const ruleRefs = ['AFF-01', 'AFF-02', 'AFF-03'];
  if (emiUnknown) ruleRefs.push('AFF-04');
  if (expensesUnknown) ruleRefs.push('AFF-05');

  const missingLabel = [emiUnknown ? 'existing EMI' : null, expensesUnknown ? 'household expenses' : null]
    .filter(Boolean)
    .join(' and ');

  return {
    safeEmiCeiling: {
      value: Math.round(centralResult.ceiling),
      range: {
        low: Math.round(conservativeResult.ceiling),
        central: Math.round(centralResult.ceiling),
        high: Math.round(optimisticResult.ceiling),
      },
      confidence,
      explanation: `Because we don't know your exact ${missingLabel}, we show a safe-EMI range built from cautious assumptions instead of one precise number.`,
      ruleRefs,
      assumptionsUsed: rangeAssumptions,
    },
    bindingConstraint: centralResult.binding,
  };
}
