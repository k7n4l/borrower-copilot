import type { Answers } from '../rules/types';

/**
 * These fixtures encode ONLY what the Lokta brief explicitly states for
 * each persona. Anything the brief does not give us is left as
 * 'unknown' rather than invented — this is deliberate and is exactly
 * what the run-throughs are meant to demonstrate: the app must produce a
 * defensible, honestly-lower-confidence result even with real gaps in
 * the data, not silently paper over them.
 *
 * Specifically NOT invented:
 *  - Priya's household expenses (brief gives rent ₹28,000, which we treat
 *    as PART of household expenses, but her total household expenses
 *    beyond rent are not given — so total householdMonthlyExpenses is
 *    left 'unknown', with rent noted as a floor via emergencySavings-style
 *    context in the run-through, not silently substituted).
 *  - Anita's exact existing monthly EMI on her ₹35,000 outstanding app
 *    loans (brief gives outstanding balance and rate, not the EMI).
 *  - Ravi's wife as an automatic co-applicant (brief states she earns
 *    ₹18,000; hasCoApplicant is asked as a real question and defaults to
 *    false until confirmed — these fixtures show the "not yet confirmed"
 *    state; a second fixture variant shows the "confirmed" state for the
 *    run-through's sensitivity note).
 */

export const priya: Answers = {
  purpose: 'wedding',
  amountWanted: 800_000,
  productHint: 'unspecified',

  incomeType: 'salaried',
  netMonthlyIncomeSalaried: 110_000,

  existingMonthlyEMI: 14_000, // car loan EMI, explicitly given
  householdMonthlyExpenses: 'unknown', // brief gives rent (28,000) but not total household expenses — NOT invented

  ageYears: 29,
  creditScore: 780,
  recentBounce: false,

  incomeTenureYears: 5, // "5 years" at the MNC, explicitly given
  hasCoApplicant: false,
};

export const ravi: Answers = {
  purpose: 'business_stock_or_equipment',
  amountWanted: 1_500_000,
  productHint: 'unspecified',

  incomeType: 'self_employed',
  monthlyIncomeRangeLow: 40_000,
  monthlyIncomeRangeHigh: 80_000,
  annualITRIncome: 420_000, // "ITR shows ₹4,20,000/year", explicitly given

  existingMonthlyEMI: 0, // "never taken a formal loan" — explicitly zero, not unknown
  householdMonthlyExpenses: 'unknown', // not given in the brief — NOT invented

  ageYears: 42,
  creditScore: 'no_score', // "no credit score", explicitly stated — distinct from "unknown/didn't answer"
  recentBounce: false, // no bounce mentioned; absence of a stated problem here, not "unknown" — see RUNTHROUGHS.md caveat

  incomeTenureYears: 14, // "kirana store for 14 years"
  incomeStability: 'highly_variable', // cash income range 40k-80k implies real variability, asked/confirmed in questionnaire

  collateral: {
    type: 'property',
    estimatedValue: 4_500_000, // "shop premises, about ₹45,00,000"
    encumbered: false, // "unencumbered", explicitly given
  },

  claimsProductiveUse: true,
  expectedIncrementalMonthlyCashFlow: 'unknown', // Ravi hasn't quantified this — not invented

  hasCoApplicant: false, // NOT auto-assumed even though wife's income (₹18,000) is mentioned in the brief —
  // the app must ask explicitly. This fixture represents "asked, not yet confirmed".
  coApplicantMonthlyIncome: 18_000, // stored so the UI can pre-fill IF the borrower confirms, but not used unless hasCoApplicant is true
};

/** Sensitivity variant: what happens if Ravi confirms his wife as co-applicant. Used in RUNTHROUGHS.md and the live follow-up demo. */
export const raviWithCoApplicant: Answers = {
  ...ravi,
  hasCoApplicant: true,
};

export const anita: Answers = {
  purpose: 'vehicle',
  amountWanted: 150_000,
  productHint: 'unspecified',

  incomeType: 'informal',
  monthlyIncomeRangeLow: 26_000,
  monthlyIncomeRangeHigh: 30_000,

  existingMonthlyEMI: 'unknown', // brief gives outstanding balance (₹35,000) and rate (30%+) but NOT a monthly EMI figure — NOT invented
  householdMonthlyExpenses: 'unknown', // not given — NOT invented

  ageYears: 35,
  creditScore: 'no_score', // no formal credit history implied for an informal-sector borrower with app loans only; treated as no_score, not "unknown"
  recentBounce: true, // "one EMI bounced last month", explicitly given

  existingLoanDetail: {
    count: 3, // "three app loans", explicitly given
    highestRateApprox: 0.3, // "30%+", explicitly given (used as the floor of the stated range)
  },
  bounceDetail: {
    timesInLast12Months: 1, // "bounced last month" — only one instance mentioned; do not invent a history beyond this
    resolved: false, // not stated as resolved
  },

  hasCoApplicant: false, // husband is unemployed — brief gives no income figure for him, and he is not a candidate co-applicant anyway
  claimsProductiveUse: true, // "to double delivery runs" — her own claim
  expectedIncrementalMonthlyCashFlow: 'unknown', // she gives an outcome claim ("double delivery runs"), not a rupee figure — NOT invented
};
