import type { Answers } from '../rules/types';

/**
 * The starting draft for a new session. Every field that can legitimately
 * be "don't know" starts as 'unknown', never 0/false — that way, a
 * borrower who never reaches an adaptive question (because they stopped
 * early) gets exactly the same honest "unknown" treatment as one who
 * explicitly picked "I don't know".
 */
export const DEFAULT_DRAFT: Answers = {
  purpose: 'other_consumption',
  amountWanted: 0,
  productHint: 'unknown',

  incomeType: 'salaried',
  existingMonthlyEMI: 'unknown',
  householdMonthlyExpenses: 'unknown',

  ageYears: 0,
  creditScore: 'unknown',
  recentBounce: 'unknown',

  hasCoApplicant: false,
};
