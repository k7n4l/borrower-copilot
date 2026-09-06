import type { QuestionDef } from './schema';
import type { Answers } from '../rules/types';

const BUSINESS_PURPOSES: Answers['purpose'][] = ['business_stock_or_equipment', 'business_expansion'];

export const ADAPTIVE_QUESTIONS: QuestionDef[] = [
  {
    id: 'incomeTenureYears',
    tier: 'adaptive',
    section: 'Stability',
    prompt: 'How many years have you been in this job / running this business?',
    reason: 'Asked because: longer, established income history supports a tighter (less cautious) confidence rating. Changes: overall confidence and, for self-employed/informal borrowers, whether we treat the income range as reasonably reliable.',
    affects: ['CONF-01'],
    controlType: 'number',
    appliesWhen: (d) => d.incomeType !== 'salaried' || true, // relevant for everyone, but especially non-salaried
    skipReason: () => null,
    allowUnknown: true,
    applyAnswer: (draft, raw) => ({ ...draft, incomeTenureYears: raw === 'unknown' ? 'unknown' : Number(raw) }),
  },
  {
    id: 'incomeStability',
    tier: 'adaptive',
    section: 'Stability',
    prompt: 'How would you describe your income month to month?',
    reason:
      'Asked because: this is only meaningful for non-salaried income, where variability is real. Changes: confidence, and can be surfaced alongside the income range explanation.',
    affects: ['CONF-01', 'INC-01', 'INC-02'],
    controlType: 'single_select',
    options: [
      { value: 'stable', label: 'Fairly stable' },
      { value: 'somewhat_variable', label: 'Somewhat variable' },
      { value: 'highly_variable', label: 'Highly variable' },
    ],
    appliesWhen: (d) => d.incomeType === 'self_employed' || d.incomeType === 'informal',
    skipReason: (d) => (d.incomeType === 'salaried' ? 'Skipped: salaried income is treated as fixed.' : null),
    allowUnknown: true,
    applyAnswer: (draft, raw) => ({ ...draft, incomeStability: raw as Answers['incomeStability'] }),
  },
  {
    id: 'annualITRIncome',
    tier: 'adaptive',
    section: 'Income',
    prompt: 'What was your last filed ITR annual income?',
    helpText: "Pick 'I don't know / haven't filed' if this doesn't apply.",
    reason:
      "Asked because: only self-employed borrowers have a distinct documented-vs-cash income gap. Changes: the LENDER-LIKELY income figure directly (anchors to ITR instead of your cash estimate) — this is often the single biggest driver of the safe-vs-lender-likely gap.",
    affects: ['INC-03', 'O2'],
    controlType: 'currency_number',
    appliesWhen: (d) => d.incomeType === 'self_employed',
    skipReason: (d) => (d.incomeType !== 'self_employed' ? 'Skipped: only relevant for self-employed income.' : null),
    allowUnknown: true,
    applyAnswer: (draft, raw) => ({ ...draft, annualITRIncome: raw === 'unknown' ? 'unknown' : Number(raw) }),
  },
  {
    id: 'existingLoanDetail',
    tier: 'adaptive',
    section: 'Existing debt',
    prompt: 'How many active loans do you have, and what is the highest interest rate among them (roughly)?',
    helpText: "If you're not sure of the exact rate, your best estimate is fine — or say 'I don't know'.",
    reason:
      "Asked because: relevant whenever there might be existing debt — including when the exact EMI amount itself is unknown but the borrower can still describe the loans (this is exactly Anita's situation: her outstanding balance and rate are known even though her monthly EMI isn't). Changes: whether existing debt is flagged as high-cost, which can combine with a recent bounce to trigger a stronger caution or a \"Don't borrow\" verdict.",
    affects: ['VER-02', 'O1'],
    controlType: 'number', // simplified UI: count; rate captured via a secondary control in the real UI (see ExistingLoanDetailQuestion component)
    appliesWhen: (d) => d.existingMonthlyEMI !== 0,
    skipReason: (d) =>
      d.existingMonthlyEMI === 0 ? 'Skipped: borrower confirmed no existing EMI, so there is no existing loan to describe.' : null,
    allowUnknown: true,
    applyAnswer: (draft, raw) => {
      const v = raw as { count: number; highestRateApprox: number | 'unknown' } | 'unknown';
      if (v === 'unknown') return { ...draft, existingLoanDetail: 'unknown' };
      return { ...draft, existingLoanDetail: { count: v.count, highestRateApprox: v.highestRateApprox } };
    },
  },
  {
    id: 'creditCardUtilisationPct',
    tier: 'adaptive',
    section: 'Existing debt',
    prompt: 'If you have a credit card, roughly what % of your limit do you usually carry?',
    reason:
      'Asked because: high utilisation is a recognised early-warning risk signal separate from a formal score. Changes: a minor upward nudge to the fair-rate band when utilisation is very high; skipped if no card.',
    affects: ['RATE-01'],
    controlType: 'number',
    appliesWhen: () => true,
    skipReason: () => null,
    allowUnknown: true,
    applyAnswer: (draft, raw) => ({
      ...draft,
      creditCardUtilisationPct: raw === 'unknown' ? 'unknown' : Number(raw),
    }),
  },
  {
    id: 'bounceDetail',
    tier: 'adaptive',
    section: 'Distress detail',
    prompt: 'How many times has this happened in the last 12 months, and is it resolved now?',
    reason:
      "Asked because: only relevant if you said yes to a recent bounce. Changes: whether the bounce is treated as resolved (softer rate impact) or active (can combine with high-cost debt to trigger \"Don't borrow\").",
    affects: ['VER-02', 'RATE-02'],
    controlType: 'boolean', // simplified: resolved yes/no; count captured alongside in the real component
    appliesWhen: (d) => d.recentBounce === true,
    skipReason: (d) => (d.recentBounce !== true ? 'Skipped: no recent bounce reported.' : null),
    allowUnknown: false,
    applyAnswer: (draft, raw) => {
      const v = raw as { timesInLast12Months: number; resolved: boolean };
      return { ...draft, bounceDetail: v };
    },
  },
  {
    id: 'emergencySavingsMonths',
    tier: 'adaptive',
    section: 'Buffers',
    prompt: 'If your income stopped today, how many months of expenses could you cover from savings?',
    reason:
      'Asked because: this is genuinely informative for everyone, especially variable-income borrowers. Changes: the stress-case narrative (a thin buffer makes the income-drop stress case more consequential) and can nudge overall confidence.',
    affects: ['STRESS-01', 'CONF-01'],
    controlType: 'number',
    appliesWhen: () => true,
    skipReason: () => null,
    allowUnknown: true,
    applyAnswer: (draft, raw) => ({
      ...draft,
      emergencySavingsMonths: raw === 'unknown' ? 'unknown' : Number(raw),
    }),
  },
  {
    id: 'upcomingLargeExpense',
    tier: 'adaptive',
    section: 'Buffers',
    prompt: 'Any large expense coming up in the next 6 months (school fees, medical, festival, etc.)?',
    helpText: 'Enter ₹0 if none.',
    reason:
      'Asked because: an upcoming known expense should trim the safety buffer shown in the stress case. Changes: the stress-case explanation shown alongside O4.',
    affects: ['STRESS-01'],
    controlType: 'currency_number',
    appliesWhen: () => true,
    skipReason: () => null,
    allowUnknown: true,
    applyAnswer: (draft, raw) => ({
      ...draft,
      upcomingLargeExpense: raw === 'unknown' ? 'unknown' : Number(raw),
    }),
  },
  {
    id: 'collateral',
    tier: 'adaptive',
    section: 'Collateral',
    prompt: 'Do you have property, gold, or a vehicle you could offer as security?',
    helpText: "This can significantly change your rate and eligible amount — but it doesn't replace the affordability check.",
    reason:
      'Asked because: only meaningful for business-purpose or larger unsecured requests where a secured route could plausibly apply. Changes: product routing (ROUTE-01), the fair-rate band (secured products price lower), and the lender-likely amount ceiling via an LTV cap.',
    affects: ['ROUTE-01', 'ROUTE-02', 'O2', 'O3'],
    controlType: 'boolean', // simplified toggle; value/type/encumbrance captured via a dedicated component
    appliesWhen: (d) => BUSINESS_PURPOSES.includes(d.purpose as Answers['purpose']) || (d.amountWanted ?? 0) > 500_000,
    skipReason: (d) =>
      !BUSINESS_PURPOSES.includes(d.purpose as Answers['purpose']) && (d.amountWanted ?? 0) <= 500_000
        ? 'Skipped: small, non-business request — collateral is unlikely to change the recommended route.'
        : null,
    allowUnknown: true,
    applyAnswer: (draft, raw) => {
      const v = raw as { type: 'property' | 'gold' | 'vehicle' | 'other'; estimatedValue: number; encumbered: boolean } | 'unknown';
      return { ...draft, collateral: v };
    },
  },
  {
    id: 'hasCoApplicant',
    tier: 'adaptive',
    section: 'Co-applicant',
    prompt: 'Will anyone else (spouse, parent, sibling) be a joint applicant on this specific loan?',
    helpText: 'Only say yes if they will formally apply with you — not just because they also earn.',
    reason:
      "Asked because: a household member's income should never be silently assumed. Changes: whether their income is added to your affordability figures at all.",
    affects: ['INC-04', 'INC-05a', 'INC-05b', 'O1', 'O2'],
    controlType: 'boolean',
    appliesWhen: () => true,
    skipReason: () => null,
    allowUnknown: false,
    applyAnswer: (draft, raw) => ({ ...draft, hasCoApplicant: raw === true }),
  },
  {
    id: 'coApplicantMonthlyIncome',
    tier: 'adaptive',
    section: 'Co-applicant',
    prompt: 'What is their monthly income?',
    reason:
      'Asked because: only relevant once a co-applicant is confirmed. Changes: the effective income used for both safe and lender-likely calculations, at different documented recognition factors for each.',
    affects: ['INC-05a', 'INC-05b', 'O1', 'O2'],
    controlType: 'currency_number',
    appliesWhen: (d) => d.hasCoApplicant === true,
    skipReason: (d) => (d.hasCoApplicant !== true ? 'Skipped: no confirmed co-applicant.' : null),
    allowUnknown: true,
    applyAnswer: (draft, raw) => ({
      ...draft,
      coApplicantMonthlyIncome: raw === 'unknown' ? 'unknown' : Number(raw),
    }),
  },
  {
    id: 'claimsProductiveUse',
    tier: 'adaptive',
    section: 'Productive use',
    prompt: 'Will this loan directly help you earn more (e.g. new equipment, stock, an income-generating vehicle)?',
    reason:
      'Asked because: only meaningful for business/vehicle purposes. Changes: whether we show a separate, heavily-discounted productive-use sensitivity alongside the main numbers — it never inflates the main safe/lender-likely figures.',
    affects: ['O4'],
    controlType: 'boolean',
    appliesWhen: (d) => BUSINESS_PURPOSES.includes(d.purpose as Answers['purpose']) || d.purpose === 'vehicle',
    skipReason: (d) =>
      !BUSINESS_PURPOSES.includes(d.purpose as Answers['purpose']) && d.purpose !== 'vehicle'
        ? 'Skipped: purpose is not business/vehicle, so a productive-use claim would not be relevant.'
        : null,
    allowUnknown: false,
    applyAnswer: (draft, raw) => ({ ...draft, claimsProductiveUse: raw === true }),
  },
  {
    id: 'expectedIncrementalMonthlyCashFlow',
    tier: 'adaptive',
    section: 'Productive use',
    prompt: 'Roughly how much extra could this bring in per month?',
    helpText: "Your best guess is fine — or say 'I don't know'.",
    reason:
      'Asked because: only relevant once a productive-use claim is made. Changes: the sensitivity note shown alongside O4 (never the core safe/lender-likely numbers, since this is an unverified borrower claim).',
    affects: ['O4'],
    controlType: 'currency_number',
    appliesWhen: (d) => d.claimsProductiveUse === true,
    skipReason: (d) => (d.claimsProductiveUse !== true ? 'Skipped: no productive-use claim made.' : null),
    allowUnknown: true,
    applyAnswer: (draft, raw) => ({
      ...draft,
      expectedIncrementalMonthlyCashFlow: raw === 'unknown' ? 'unknown' : Number(raw),
    }),
  },
];
