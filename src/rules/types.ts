// ---------------------------------------------------------------------------
// Core types for the Borrower Copilot rules engine.
//
// Design principle (see RULES.md, section "Unknown handling"):
// Any field that the borrower might legitimately not know is typed as
// `Unknown<T>` = T | "unknown". This makes it a compile error to silently
// coerce a missing answer into 0/false somewhere deep in a calculation —
// every consumer of an Unknown<T> is forced to handle the "unknown" branch
// explicitly.
// ---------------------------------------------------------------------------

export type Unknown<T> = T | 'unknown';

export function isUnknown<T>(v: Unknown<T>): v is 'unknown' {
  return v === 'unknown';
}

// ---------------------------------------------------------------------------
// Domain enums
// ---------------------------------------------------------------------------

export type IncomeType = 'salaried' | 'self_employed' | 'informal';

export type LoanPurpose =
  | 'wedding'
  | 'medical'
  | 'education'
  | 'home_improvement'
  | 'debt_consolidation'
  | 'vehicle'
  | 'business_stock_or_equipment'
  | 'business_expansion'
  | 'other_consumption'
  | 'other';

export type ProductType =
  | 'personal_loan'
  | 'loan_against_property'
  | 'business_loan_secured'
  | 'gold_loan'
  | 'two_wheeler_loan'
  | 'home_loan'
  | 'unspecified';

export type Confidence = 'High' | 'Medium' | 'Low';

export type Verdict = 'borrow' | 'borrow_less' | 'dont_borrow';

// ---------------------------------------------------------------------------
// Answers
//
// Every field the borrower might not know is Unknown<T>. Fields that are
// only relevant to certain segments/purposes are optional (`?`) — the
// question engine decides whether to ask them (see questions/questionEngine.ts);
// the rules engine treats "not asked" and "asked but unknown" identically
// (both become 'unknown' when read through the accessor helpers).
// ---------------------------------------------------------------------------

export interface CoreAnswers {
  // Loan basics
  purpose: LoanPurpose;
  amountWanted: number; // ₹, required numeric input
  productHint: Unknown<ProductType>; // what the borrower thinks they want, if anything

  // Income
  incomeType: IncomeType;
  /** Salaried: single reliable monthly figure. */
  netMonthlyIncomeSalaried?: Unknown<number>;
  /** Self-employed / informal: borrower's own stated range. */
  monthlyIncomeRangeLow?: Unknown<number>;
  monthlyIncomeRangeHigh?: Unknown<number>;
  /** Self-employed only: last filed ITR, annualised documented income. */
  annualITRIncome?: Unknown<number>;

  // Existing obligations
  existingMonthlyEMI: Unknown<number>;
  householdMonthlyExpenses: Unknown<number>;

  // Borrower profile
  ageYears: number;
  creditScore: Unknown<number> | 'no_score'; // 'no_score' = thin/no file (e.g. Ravi), distinct from "asked but doesn't recall"
  recentBounce: Unknown<boolean>;
}

export interface AdaptiveAnswers {
  // Stability / history
  incomeStability?: Unknown<'stable' | 'somewhat_variable' | 'highly_variable'>;

  // Existing debt detail
  existingLoanDetail?: Unknown<{
    count: number;
    highestRateApprox: Unknown<number>; // annual %, e.g. 0.30 for 30%
  }>;
  // Distress detail (asked only if recentBounce === true)
  bounceDetail?: Unknown<{
    timesInLast12Months: number;
    resolved: boolean;
  }>;

  // Buffers
  // Collateral (asked for secured-relevant purposes/products)
  collateral?: Unknown<{
    type: 'property' | 'gold' | 'vehicle' | 'other';
    estimatedValue: number;
    encumbered: boolean;
  }>;

  // Co-applicant — NEVER auto-assumed. Must be explicit opt-in.
  hasCoApplicant?: boolean; // default false until borrower confirms
  coApplicantMonthlyIncome?: Unknown<number>;

}

export type Answers = CoreAnswers & AdaptiveAnswers;

// ---------------------------------------------------------------------------
// Rule-annotated outputs
//
// Every user-visible number in this app is wrapped in this shape so the UI
// never has to invent an explanation separately from the calculation that
// produced it, and every explanation is traceable to rule IDs that also
// appear verbatim in RULES.md.
// ---------------------------------------------------------------------------

export interface RangeValue {
  low: number;
  central: number;
  high: number;
}

export interface RuleOutput<T> {
  value: T;
  range?: RangeValue; // populated when the value is inherently a planning range, not a point
  confidence: Confidence;
  explanation: string; // one sentence, borrower-facing
  ruleRefs: string[]; // e.g. ["AFF-01", "AFF-03"]
  assumptionsUsed: string[]; // human-readable list of any 'unknown' fallback assumptions applied here
}

// ---------------------------------------------------------------------------
// Full decision model returned by computeOutputs()
// ---------------------------------------------------------------------------

export interface IncomeModel {
  reliableMonthlyIncome: RuleOutput<number>; // conservative, used for BORROWER-SAFE calcs
  documentedMonthlyIncomeForLender: RuleOutput<number>; // used for LENDER-LIKELY calcs
  segment: IncomeType;
}

export interface AffordabilityModel {
  safeEmiCeiling: RuleOutput<number>;
  bindingConstraint: 'foir' | 'residual' | 'both_equal';
}

export interface VerdictOutput extends RuleOutput<Verdict> {
  distressFlags: string[]; // human-readable list of hard-stop / caution flags that fired
}

export interface AmountOutput {
  borrowerSafeAmount: RuleOutput<number>;
  lenderLikelyAmount: RuleOutput<number>;
  assumedRate: number; // annual %, midpoint used for the amount<->EMI conversion
  assumedTenureYears: number;
}

export interface RateOutput extends RuleOutput<RangeValue> {
  productType: ProductType;
}

export interface AprOutput extends RuleOutput<number> {
  processingFeePct: number;
  method: string;
}

export interface TenureOption {
  label: 'Short' | 'Balanced' | 'Long';
  years: number;
  emi: number;
  totalInterest: number;
}

export interface TenureOutput {
  options: TenureOption[];
  recommended: 'Short' | 'Balanced' | 'Long';
  explanation: string;
  ruleRefs: string[];
}

export interface StressOutput {
  incomeDropPct: number;
  ratePlusBps: number; // 0 if not applicable (fixed-rate product)
  stressedSafeEmiCeiling: number;
  verdictHolds: boolean;
  explanation: string;
  ruleRefs: string[];
}

export interface ProductRoutingOutput extends RuleOutput<ProductType> {
  alternativesConsidered: ProductType[];
}

export interface DecisionModel {
  income: IncomeModel;
  affordability: AffordabilityModel;
  productRouting: ProductRoutingOutput;
  verdict: VerdictOutput;
  amount: AmountOutput;
  rate: RateOutput;
  apr: AprOutput;
  tenure: TenureOutput;
  stress: StressOutput;
  overallConfidence: Confidence;
  materialUnknowns: string[]; // field names still unknown that matter for this borrower
}
