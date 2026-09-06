import type { Answers, Confidence } from './types';
import { isUnknown } from './types';
import { CONFIDENCE_RULES } from './constants';

/**
 * CONF-01/CONF-02: overall confidence is driven by how many MATERIAL
 * fields are unknown — not by what fraction of all optional questions
 * were answered. A borrower who skipped five irrelevant questions but
 * answered every material one should show High confidence; a borrower
 * who answered many optional questions but left a material one unknown
 * should not.
 */
export function computeOverallConfidence(a: Answers, isSecuredRoute: boolean): { confidence: Confidence; materialUnknowns: string[] } {
  const unknowns: string[] = [];

  if (isUnknown(a.existingMonthlyEMI)) unknowns.push('existingMonthlyEMI');
  if (isUnknown(a.householdMonthlyExpenses)) unknowns.push('householdMonthlyExpenses');
  if (isUnknown(a.incomeStability) || a.incomeStability === undefined) {
    if (a.incomeType !== 'salaried') unknowns.push('incomeStability');
  }
  if (a.creditScore === 'no_score' || isUnknown(a.creditScore)) unknowns.push('creditScore');
  if (isUnknown(a.recentBounce)) unknowns.push('recentBounce');
  if (a.incomeType === 'self_employed' && (isUnknown(a.annualITRIncome) || a.annualITRIncome === undefined)) {
    unknowns.push('annualITRIncome');
  }
  if (isSecuredRoute && (isUnknown(a.collateral) || a.collateral === undefined)) {
    unknowns.push('collateral');
  }

  const count = unknowns.length;
  const confidence: Confidence =
    count <= CONFIDENCE_RULES.HIGH_MAX_UNKNOWNS ? 'High' : count <= CONFIDENCE_RULES.MEDIUM_MAX_UNKNOWNS ? 'Medium' : 'Low';

  return { confidence, materialUnknowns: unknowns };
}
