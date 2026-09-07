import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS } from '../questions/questionEngine';
import { DEFAULT_DRAFT } from '../questions/defaultDraft';
import { computeOutputs } from '../rules/engine';
import { priya, ravi, anita } from '../data/personas';
import type { Answers } from '../rules/types';

/**
 * Drives the actual question engine (appliesWhen predicates, applyAnswer
 * functions) using each persona's known field values as the "raw" answer
 * a borrower would have typed/selected, in question order, skipping any
 * question the engine itself decides doesn't apply. This proves the
 * ADAPTIVE FLOW ITSELF — not just the rules engine — produces the right
 * skip pattern and reconstructs each persona correctly, with no
 * per-persona branching anywhere in the question definitions.
 */
function simulateFlow(persona: Answers): { finalDraft: Answers; askedIds: string[]; skippedIds: string[] } {
  let draft: Answers = { ...DEFAULT_DRAFT };
  const askedIds: string[] = [];
  const skippedIds: string[] = [];

  for (const q of ALL_QUESTIONS) {
    if (!q.appliesWhen(draft)) {
      skippedIds.push(q.id);
      continue;
    }
    const rawValue = extractRawForQuestion(q.id, persona);
    if (rawValue === undefined) {
      // Persona fixture doesn't specify this field at all (never happens
      // for our three personas' relevant fields, but guards against a
      // mis-specified test).
      skippedIds.push(q.id);
      continue;
    }
    draft = q.applyAnswer(draft, rawValue);
    askedIds.push(q.id);
  }

  return { finalDraft: draft, askedIds, skippedIds };
}

/** Maps a question id back to the raw UI-shaped value a borrower would have provided, from a persona fixture. */
function extractRawForQuestion(id: string, p: Answers): unknown {
  switch (id) {
    case 'purpose':
      return p.purpose;
    case 'amountWanted':
      return p.amountWanted;
    case 'productHint':
      return p.productHint === 'unknown' ? 'unspecified' : p.productHint;
    case 'incomeType':
      return p.incomeType;
    case 'netMonthlyIncomeSalaried':
      return p.netMonthlyIncomeSalaried;
    case 'monthlyIncomeRange':
      return { low: p.monthlyIncomeRangeLow, high: p.monthlyIncomeRangeHigh };
    case 'existingMonthlyEMI':
      return p.existingMonthlyEMI;
    case 'householdMonthlyExpenses':
      return p.householdMonthlyExpenses;
    case 'ageYears':
      return p.ageYears;
    case 'creditScore':
      return p.creditScore;
    case 'recentBounce':
      return p.recentBounce;
    case 'incomeStability':
      return p.incomeStability ?? 'unknown';
    case 'annualITRIncome':
      return p.annualITRIncome ?? 'unknown';
    case 'existingLoanDetail':
      return p.existingLoanDetail ?? 'unknown';
    case 'bounceDetail':
      return p.bounceDetail && p.bounceDetail !== 'unknown' ? p.bounceDetail : undefined;
    case 'collateral':
      return p.collateral ?? 'unknown';
    case 'hasCoApplicant':
      return p.hasCoApplicant ?? false;
    case 'coApplicantMonthlyIncome':
      return p.coApplicantMonthlyIncome ?? 'unknown';
    default:
      return undefined;
  }
}

describe('Adaptive question flow reproduces the golden personas', () => {
  it('does not include removed non-load-bearing questions', () => {
    const ids = ALL_QUESTIONS.map((question) => question.id);
    expect(ids).not.toEqual(expect.arrayContaining([
      'incomeTenureYears',
      'creditCardUtilisationPct',
      'emergencySavingsMonths',
      'upcomingLargeExpense',
      'claimsProductiveUse',
      'expectedIncrementalMonthlyCashFlow',
    ]));
  });

  it('Priya: flow skips self-employed/informal-only questions and produces the Borrow verdict', () => {
    const { finalDraft, askedIds, skippedIds } = simulateFlow(priya);
    expect(skippedIds).toContain('monthlyIncomeRange'); // salaried, so this doesn't apply
    expect(skippedIds).toContain('annualITRIncome'); // salaried
    expect(skippedIds).toContain('incomeStability'); // salaried
    expect(askedIds).toContain('netMonthlyIncomeSalaried');
    const result = computeOutputs(finalDraft);
    expect(result.verdict.value).toBe('borrow');
  });

  it('Ravi: flow asks self-employed-specific questions (ITR, income range, stability) and collateral, and produces Borrow less + secured routing', () => {
    const { finalDraft, askedIds, skippedIds } = simulateFlow(ravi);
    expect(askedIds).toContain('monthlyIncomeRange');
    expect(askedIds).toContain('annualITRIncome');
    expect(askedIds).toContain('incomeStability');
    expect(askedIds).toContain('collateral'); // business purpose triggers this
    expect(skippedIds).toContain('netMonthlyIncomeSalaried'); // not salaried
    const result = computeOutputs(finalDraft);
    expect(result.verdict.value).toBe('borrow_less');
    expect(result.productRouting.value).toBe('loan_against_property');
  });

  it("Ravi: wife's income question is correctly skipped entirely because hasCoApplicant is false, so it never enters the calculation", () => {
    const { finalDraft, skippedIds } = simulateFlow(ravi); // ravi fixture has hasCoApplicant: false
    expect(finalDraft.hasCoApplicant).toBe(false);
    expect(skippedIds).toContain('coApplicantMonthlyIncome');
    const result = computeOutputs(finalDraft);
    expect(result.income.reliableMonthlyIncome.value).toBe(40_000); // unaffected by the co-applicant figure
  });

  it("Anita: flow asks distress-detail questions (existingLoanDetail, bounceDetail) because she reported a bounce and active loans, and produces Don't borrow without ever asking for or inventing an exact EMI figure", () => {
    const { finalDraft, askedIds } = simulateFlow(anita);
    expect(askedIds).toContain('existingLoanDetail');
    expect(askedIds).toContain('bounceDetail');
    expect(finalDraft.existingMonthlyEMI).toBe('unknown');
    const result = computeOutputs(finalDraft);
    expect(result.verdict.value).toBe('dont_borrow');
    expect(result.verdict.ruleRefs).toContain('VER-02');
  });

  it('Anita: collateral question is skipped (small ticket, non-business purpose)', () => {
    const { skippedIds } = simulateFlow(anita);
    expect(skippedIds).toContain('collateral');
  });
});
