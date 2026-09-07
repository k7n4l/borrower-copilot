// ---------------------------------------------------------------------------
// RULE CONSTANTS
//
// Every value here has a corresponding row in RULES.md with the same
// rule ID, a plain-language "why", and a "Source / my judgement" label.
// Do not change a number here without updating RULES.md — they must never
// drift, since RULES.md is written by walking this file.
//
// IMPORTANT: none of these are claims about actual RBI regulation or any
// specific lender's underwriting policy. They are this product's own
// borrower-safety planning assumptions, clearly labelled as such wherever
// they surface in the UI and in RULES.md.
// ---------------------------------------------------------------------------

/** INC-xx — Income normalisation */
export const INCOME_RULES = {
  /** INC-01: self-employed reliable income = low end of stated range.
   *  My judgement — deliberately conservative because a stated range is
   *  self-reported and unverified; using the low end protects the borrower
   *  from over-committing against income that may not recur. */
  SELF_EMPLOYED_RELIABLE_INCOME: 'range_low' as const,

  /** INC-02: informal-income reliable income = low end of stated range,
   *  identical treatment to self-employed. My judgement. */
  INFORMAL_RELIABLE_INCOME: 'range_low' as const,

  /** INC-03: for self-employed borrowers, the LENDER-LIKELY income anchor
   *  uses documented ITR income (annualised / 12), not the borrower's cash
   *  estimate — because that is what a lender can actually verify.
   *  My judgement, informed by common documented-income underwriting practice. */
  LENDER_ANCHOR_USES_ITR_FOR_SELF_EMPLOYED: true,

  /** INC-04: co-applicant income is NEVER added automatically. It is only
   *  included if the borrower explicitly confirms the person will be a
   *  joint applicant on this specific loan (hasCoApplicant === true).
   *  Product/UX judgement — a spouse's income is not the borrower's to
   *  spend without their informed participation in the loan. */
  COAPPLICANT_REQUIRES_EXPLICIT_OPT_IN: true,

  /** INC-05a: for the BORROWER-SAFE calculation, a confirmed co-applicant's
   *  income is recognised at a conservative partial rate. This is our own
   *  planning caution, not a lender rule — we don't know the co-applicant's
   *  own obligations, so we don't want the borrower to lean on the full
   *  amount when deciding what's safe for the household.
   *  My judgement, not a lender/RBI rule. */
  SAFE_COAPPLICANT_RECOGNITION_FACTOR: 0.6,

  /** INC-05b: for the LENDER-LIKELY estimate, real lenders vary widely in
   *  how much of a co-applicant's income they recognise (some effectively
   *  treat it as fully joint income if the co-applicant is also salaried
   *  and formally on the loan; some discount informal/self-employed
   *  co-applicant income much more heavily). We use a slightly higher
   *  illustrative factor than the safe-side one to reflect that a lender
   *  is evaluating combined repayment capacity, not just protecting the
   *  borrower's personal safety margin — but this must NOT be read as
   *  "this is what your lender will do." Illustrative, verify with the
   *  specific lender/product. */
  LENDER_LIKELY_COAPPLICANT_RECOGNITION_FACTOR: 0.8,
} as const;

/** AFF-xx — Affordability (FOIR + residual hybrid) */
export const AFFORDABILITY_RULES = {
  /** AFF-01: FOIR ceiling by income segment and income level.
   *  My judgement / common planning convention — NOT a universal RBI or
   *  lender-mandated threshold. RBI does not fix a single FOIR percentage. */
  FOIR_CEILING: {
    salaried_low: 0.4, // reliable income < 50,000/mo
    salaried_mid: 0.45, // 50,000 - 100,000/mo
    salaried_high: 0.5, // > 100,000/mo
    self_employed: 0.35, // flat — volatility risk doesn't shrink just because income is higher
    informal: 0.3,
  },
  FOIR_SALARIED_LOW_THRESHOLD: 50_000,
  FOIR_SALARIED_HIGH_THRESHOLD: 100_000,

  /** AFF-02: residual-income safety buffer, taken off the top before
   *  computing what's left for a new EMI. My judgement — protects against
   *  a technically-FOIR-compliant EMI that still leaves too thin a margin. */
  RESIDUAL_SAFETY_BUFFER_PCT_OF_INCOME: 0.15,

  /** AFF-03: the safe EMI ceiling is the STRICTER (lower) of the FOIR-based
   *  ceiling and the residual-income-based ceiling. Product judgement. */
  CEILING_IS_MINIMUM_OF_BOTH: true,

  /** AFF-04: when existing monthly EMI is unknown, we do NOT treat it as
   *  ₹0 (that would overstate affordability — the unsafe direction) and we
   *  do NOT invent a single precise number either. Instead we represent
   *  it as a plausible RANGE of what an undisclosed existing-EMI burden
   *  might be, expressed as a % of income, and carry that range into the
   *  safe-EMI-ceiling calculation as low/central/high — the ORIGINAL
   *  answer stays 'unknown' in the answer record; only the calculation
   *  uses this range internally, and the UI must label the resulting
   *  numbers as an assumption, not the borrower's actual EMI.
   *  My judgement: 5%-20% of income is a deliberately wide band meant to
   *  cover "probably has some debt but we have no idea how much" without
   *  pretending precision we don't have. 10% is used as the central
   *  planning estimate. Not derived from any survey or lender data. */
  UNKNOWN_EXISTING_EMI_PLACEHOLDER_RANGE_PCT_OF_INCOME: { low: 0.05, central: 0.1, high: 0.2 },

  /** AFF-05: same principle for household expenses when unknown — a
   *  RANGE, not a single invented figure, and the original answer stays
   *  'unknown'. My judgement: 35%-55% of income is a deliberately wide
   *  planning band for urban/semi-urban Indian households; 45% is the
   *  central estimate. Not survey-derived. */
  UNKNOWN_HOUSEHOLD_EXPENSES_PLACEHOLDER_RANGE_PCT_OF_INCOME: { low: 0.35, central: 0.45, high: 0.55 },
} as const;

/** VER-xx — Borrow / Borrow less / Don't borrow decision tree */
export const VERDICT_RULES = {
  /** VER-01: hard "Don't borrow" if the safe EMI ceiling is not positive. */
  DONT_BORROW_IF_CEILING_NON_POSITIVE: true,

  /** VER-02: hard-stop caution — an unresolved recent bounce combined with
   *  existing high-cost debt (>= this rate) is treated as active repayment
   *  distress, not just a risk adjustment. My judgement: a single isolated
   *  negative signal alone should not trigger "Don't borrow" (see VER-05),
   *  but this specific combination is a materially different, more urgent
   *  situation. */
  HIGH_COST_DEBT_RATE_THRESHOLD: 0.24,

  /** VER-03: the gap threshold (requested EMI vs. safe ceiling) beyond
   *  which we say "Borrow less" and show the amount that does fit, rather
   *  than "Borrow" with a note. My judgement, deliberately not "arbitrary
   *  20%" dressed up — see VERDICT_MARGIN_RATIONALE below. */
  BORROW_LESS_MARGIN_PCT: 0.1,

  /** VER-04: rationale text for the margin above, surfaced in RULES.md and
   *  in the "Why this number?" panel — this exists so the threshold is
   *  defensible in the live follow-up, not just a magic number. */
  VERDICT_MARGIN_RATIONALE:
    'A small (<=10%) gap between the requested EMI and the safe ceiling is ' +
    'treated as within planning tolerance because our income and expense ' +
    'inputs are themselves estimates, not verified figures; a gap larger ' +
    'than that is a real affordability shortfall, not rounding noise.',

  /** VER-05: an isolated negative signal (e.g. unknown credit score alone,
   *  or a single old resolved bounce alone) must NOT by itself force
   *  "Don't borrow" — only the combinations named in VER-02 or a
   *  non-positive ceiling (VER-01) do. Explicit anti-overreaction rule. */
  SINGLE_SIGNAL_NEVER_FORCES_DONT_BORROW: true,
} as const;

/** RATE-xx — Fair rate bands (planning bands, not live market quotes) */
export const RATE_BANDS: Record<
  string,
  { low: number; high: number; why: string; source: 'my judgement' | 'illustrative, verify before real use' }
> = {
  personal_loan_strong_salaried: {
    low: 0.105,
    high: 0.13,
    why: 'Strong salaried profile: stable verifiable income, good score.',
    source: 'illustrative, verify before real use',
  },
  personal_loan_thin_file: {
    low: 0.14,
    high: 0.18,
    why: 'Self-employed / informal / no credit history: unsecured lenders price in verification and default risk.',
    source: 'illustrative, verify before real use',
  },
  loan_against_property: {
    low: 0.095,
    high: 0.12,
    why: 'Secured by immovable property; lender risk materially lower than unsecured.',
    source: 'illustrative, verify before real use',
  },
  business_loan_secured: {
    low: 0.1,
    high: 0.13,
    why: 'Secured business borrowing; similar risk profile to LAP but with business cash-flow variability.',
    source: 'illustrative, verify before real use',
  },
  gold_loan: {
    low: 0.09,
    high: 0.14,
    why: 'Highly liquid collateral (gold), fast recovery, typically tiered by LTV.',
    source: 'illustrative, verify before real use',
  },
  two_wheeler_loan: {
    low: 0.1,
    high: 0.14,
    why: 'Hypothecated vehicle loan; asset-backed but depreciating, small-ticket.',
    source: 'illustrative, verify before real use',
  },
  home_loan: {
    low: 0.08,
    high: 0.095,
    why: 'Long-tenure, high-value secured lending; lowest-risk category for lenders.',
    source: 'illustrative, verify before real use',
  },
};

/** RATE adjustment rules */
export const RATE_ADJUSTMENT_RULES = {
  /** RATE-01: unknown credit score widens the band upward on both ends
   *  and lowers confidence — it must NEVER default to the worst-case band. */
  UNKNOWN_SCORE_BAND_WIDEN_BPS: 75,

  /** RATE-02: a recent unresolved bounce shifts the band toward the
   *  higher end (adds to the low bound, not just the high bound), because
   *  it is a materially different risk signal than "unknown". */
  UNRESOLVED_BOUNCE_LOW_SHIFT_BPS: 150,
  UNRESOLVED_BOUNCE_HIGH_SHIFT_BPS: 200,

  /** RATE-03: strong score (>=750) tightens the band toward its low end. */
  STRONG_SCORE_THRESHOLD: 750,
  STRONG_SCORE_SHIFT_BPS: 50,
} as const;

/** APR-xx — All-in cost */
export const APR_RULES = {
  /** APR-01: illustrative processing fee assumption when the borrower/product
   *  doesn't specify one. My judgement / illustrative, not a lender quote. */
  DEFAULT_PROCESSING_FEE_PCT: 0.02,

  /** APR-02: APR is computed as the annualised IRR of the actual borrower
   *  cash flows (disbursement net of fee, then EMIs out), via numerical
   *  root-finding — not the crude nominal+fee/tenure approximation.
   *  This is the corrected, more honest method. */
  METHOD: 'cash_flow_irr' as const,
} as const;

/** AMT-LENDER-01 — illustrative lender-likely amount assumptions. */
export const LENDER_AMOUNT_RULES = {
  /** Looser income-only FOIR proxy; my judgement, not a lender formula. */
  LOOSER_FOIR_PCT: 0.5,
  /** Fallback when existing EMI is unknown; my judgement, not a lender formula. */
  UNKNOWN_EXISTING_EMI_PCT_OF_LENDER_INCOME: 0.1,
} as const;

/** TEN-xx — Tenure */
export const TENURE_RULES = {
  /** TEN-01: the three tenure options shown, as a fraction of the max
   *  tenure allowed for the product/age combination. */
  SHORT_FRACTION_OF_MAX: 0.5,
  BALANCED_FRACTION_OF_MAX: 0.75,
  LONG_FRACTION_OF_MAX: 1.0,

  /** TEN-02: max tenure by product (years), before the age-based cap. */
  MAX_TENURE_YEARS: {
    personal_loan: 5,
    loan_against_property: 15,
    business_loan_secured: 10,
    gold_loan: 3,
    two_wheeler_loan: 5,
    home_loan: 20,
  } as Record<string, number>,

  /** TEN-03: no loan tenure should run past this borrower age. My judgement. */
  MAX_AGE_AT_LOAN_END: 65,
} as const;

/** STRESS-xx */
export const STRESS_RULES = {
  /** STRESS-01: income-drop stress magnitude. Commonly used planning
   *  haircut; not a claim about any specific borrower's actual risk. */
  INCOME_DROP_PCT: 0.2,

  /** STRESS-02: rate-rise stress, applied only to floating-rate-typical
   *  products (LAP, home loan, business loan secured). */
  RATE_RISE_BPS: 175,
  FLOATING_RATE_PRODUCTS: ['loan_against_property', 'home_loan', 'business_loan_secured'] as ProductTypeLiteral[],
} as const;

type ProductTypeLiteral =
  | 'personal_loan'
  | 'loan_against_property'
  | 'business_loan_secured'
  | 'gold_loan'
  | 'two_wheeler_loan'
  | 'home_loan'
  | 'unspecified';

/** CONF-xx — Confidence */
export const CONFIDENCE_RULES = {
  /** CONF-01: confidence is driven by which MATERIAL fields are unknown,
   *  not by a raw percentage of optional questions answered. The fields
   *  below are considered material to affordability/risk. */
  MATERIAL_FIELDS: [
    'existingMonthlyEMI',
    'householdMonthlyExpenses',
    'incomeStability',
    'creditScore',
    'recentBounce',
    'annualITRIncome', // only material for self-employed
    'collateral', // only material when purpose/product implies secured route
  ] as const,

  /** CONF-02: High = 0 material unknowns. Medium = exactly 1. Low = 2+. */
  HIGH_MAX_UNKNOWNS: 0,
  MEDIUM_MAX_UNKNOWNS: 1,
} as const;

/** ROUTE-xx — Product routing */
export const ROUTING_RULES = {
  /** ROUTE-01: a business/productive purpose combined with sizeable,
   *  unencumbered collateral routes toward a secured business loan / LAP
   *  instead of an unsecured personal loan, because it materially lowers
   *  the fair rate and raises the feasible amount for the same repayment
   *  capacity. Product judgement, not a claim that a specific lender will
   *  offer this. */
  BUSINESS_PURPOSE_WITH_COLLATERAL_ROUTES_SECURED: true,

  /** ROUTE-02: LTV ceiling used as a planning cap for secured routes.
   *  Illustrative — verify current lender/RBI-linked caps (e.g. gold loan
   *  LTV is RBI-linked and changes over time) before relying on this. */
  LTV_CEILING: {
    loan_against_property: 0.5,
    business_loan_secured: 0.5,
    gold_loan: 0.75,
    home_loan: 0.8,
  } as Record<string, number>,

  /** ROUTE-03: vehicle-purpose + modest ticket size routes to two-wheeler
   *  hypothecation financing rather than an unsecured personal loan. */
  VEHICLE_PURPOSE_ROUTES_TWO_WHEELER_MAX_TICKET: 300_000,
} as const;
