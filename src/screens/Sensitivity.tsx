import { useMemo, useState } from 'react';
import { useBorrowerSession } from '../state/borrowerSession';
import { computeOutputs } from '../rules/engine';
import type { Answers } from '../rules/types';
import { isUnknown } from '../rules/types';
import { formatINR, formatPct } from '../utils/currency';
import { AFFORDABILITY_RULES } from '../rules/constants';

const VERDICT_LABEL: Record<string, string> = {
  borrow: 'Borrow',
  borrow_less: 'Borrow less',
  dont_borrow: "Don't borrow",
};

/**
 * This screen never touches the session's real answer draft — it clones
 * it into local component state and calls the exact same pure
 * `computeOutputs()` used everywhere else. That's what makes "change an
 * assumption, watch the app change" a live UI feature rather than a
 * hypothetical: there is no cached or precomputed result anywhere to go
 * stale, so every slider move is a full, honest recomputation.
 */
export function Sensitivity({ onBack }: { onBack: () => void }) {
  const { draft: baseDraft, outputs: baseOutputs } = useBorrowerSession();

  const [hypo, setHypo] = useState<Answers>(baseDraft);

  const hypoOutputs = useMemo(() => computeOutputs(hypo), [hypo]);

  if (!baseOutputs) return null;

  const householdKnown = !isUnknown(hypo.householdMonthlyExpenses);
  const emiKnown = !isUnknown(hypo.existingMonthlyEMI);
  const scoreKnown = typeof hypo.creditScore === 'number';

  return (
    <div className="mx-auto max-w-md px-6 py-8 pb-16">
      <button onClick={onBack} className="mb-6 text-sm text-ink-muted underline underline-offset-2">
        ← Back to results
      </button>

      <p className="text-xs uppercase tracking-wide text-ink-muted">What would change this?</p>
      <p className="mt-2 font-display text-2xl text-ink">Try a different assumption</p>
      <p className="mt-2 text-sm text-ink-soft">
        These sliders don't change your saved answers — they just show you how sensitive your result is to each one.
      </p>

      {/* Household expenses */}
      <div className="mt-6 border-t border-paper-line pt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-ink">Household expenses</label>
          <span className="tabular text-sm text-ink-soft">
            {householdKnown ? formatINR(hypo.householdMonthlyExpenses as number) : 'Unknown'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.round((estimateIncome(hypo) || 100000) * 0.8)}
          step={1000}
          value={
            householdKnown
              ? (hypo.householdMonthlyExpenses as number)
              : Math.round(estimateIncome(hypo) * AFFORDABILITY_RULES.UNKNOWN_HOUSEHOLD_EXPENSES_PLACEHOLDER_RANGE_PCT_OF_INCOME.central)
          }
          onChange={(e) => setHypo({ ...hypo, householdMonthlyExpenses: Number(e.target.value) })}
          className="mt-2 w-full accent-marigold"
        />
        {!householdKnown && (
          <p className="mt-1 text-xs text-ink-muted">
            Currently unknown in your real answers — this shows the effect of confirming a figure.
          </p>
        )}
      </div>

      {/* Existing EMI */}
      <div className="mt-6 border-t border-paper-line pt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-ink">Existing monthly EMI</label>
          <span className="tabular text-sm text-ink-soft">{emiKnown ? formatINR(hypo.existingMonthlyEMI as number) : 'Unknown'}</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.round((estimateIncome(hypo) || 100000) * 0.6)}
          step={500}
          value={
            emiKnown
              ? (hypo.existingMonthlyEMI as number)
              : Math.round(estimateIncome(hypo) * AFFORDABILITY_RULES.UNKNOWN_EXISTING_EMI_PLACEHOLDER_RANGE_PCT_OF_INCOME.central)
          }
          onChange={(e) => setHypo({ ...hypo, existingMonthlyEMI: Number(e.target.value) })}
          className="mt-2 w-full accent-marigold"
        />
        {!emiKnown && (
          <p className="mt-1 text-xs text-ink-muted">
            Currently unknown in your real answers — this shows the effect of confirming a figure.
          </p>
        )}
      </div>

      {/* Credit score */}
      <div className="mt-6 border-t border-paper-line pt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-ink">Credit score</label>
          <span className="tabular text-sm text-ink-soft">{scoreKnown ? hypo.creditScore : 'Unknown / no history'}</span>
        </div>
        <input
          type="range"
          min={300}
          max={900}
          step={10}
          value={scoreKnown ? (hypo.creditScore as number) : 650}
          onChange={(e) => setHypo({ ...hypo, creditScore: Number(e.target.value) })}
          className="mt-2 w-full accent-marigold"
        />
        {!scoreKnown && (
          <p className="mt-1 text-xs text-ink-muted">
            Currently unknown/no history in your real answers — this shows the effect of a confirmed score.
          </p>
        )}
      </div>

      {/* Co-applicant */}
      <div className="mt-6 border-t border-paper-line pt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-ink">Add a confirmed co-applicant</label>
          <button
            onClick={() => setHypo({ ...hypo, hasCoApplicant: !hypo.hasCoApplicant })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              hypo.hasCoApplicant ? 'bg-marigold/20 text-marigold-deep' : 'bg-paper-raised text-ink-muted'
            }`}
          >
            {hypo.hasCoApplicant ? 'Confirmed' : 'Not confirmed'}
          </button>
        </div>
        {hypo.hasCoApplicant && (
          <div className="mt-3">
            <label className="mb-1 block text-xs text-ink-muted">Their monthly income</label>
            <input
              type="range"
              min={0}
              max={100000}
              step={1000}
              value={typeof hypo.coApplicantMonthlyIncome === 'number' ? hypo.coApplicantMonthlyIncome : 0}
              onChange={(e) => setHypo({ ...hypo, coApplicantMonthlyIncome: Number(e.target.value) })}
              className="w-full accent-marigold"
            />
            <p className="tabular mt-1 text-sm text-ink-soft">
              {formatINR(typeof hypo.coApplicantMonthlyIncome === 'number' ? hypo.coApplicantMonthlyIncome : 0)}
            </p>
          </div>
        )}
      </div>

      <button onClick={() => setHypo(baseDraft)} className="mt-6 text-sm text-ink-muted underline underline-offset-2">
        Reset to my real answers
      </button>

      {/* Comparison */}
      <div className="mt-8 rounded-xl border border-paper-line bg-paper-raised p-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted">With this assumption</p>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <ComparisonRow
            label="Verdict"
            before={VERDICT_LABEL[baseOutputs.verdict.value]}
            after={VERDICT_LABEL[hypoOutputs.verdict.value]}
            changed={baseOutputs.verdict.value !== hypoOutputs.verdict.value}
          />
          <ComparisonRow
            label="Safe EMI"
            before={formatINR(baseOutputs.affordability.safeEmiCeiling.value) + '/mo'}
            after={formatINR(hypoOutputs.affordability.safeEmiCeiling.value) + '/mo'}
            changed={baseOutputs.affordability.safeEmiCeiling.value !== hypoOutputs.affordability.safeEmiCeiling.value}
          />
          <ComparisonRow
            label="Safe amount"
            before={formatINR(baseOutputs.amount.borrowerSafeAmount.value)}
            after={formatINR(hypoOutputs.amount.borrowerSafeAmount.value)}
            changed={baseOutputs.amount.borrowerSafeAmount.value !== hypoOutputs.amount.borrowerSafeAmount.value}
          />
          <ComparisonRow
            label="Fair rate"
            before={`${formatPct(baseOutputs.rate.value.low)}–${formatPct(baseOutputs.rate.value.high)}`}
            after={`${formatPct(hypoOutputs.rate.value.low)}–${formatPct(hypoOutputs.rate.value.high)}`}
            changed={baseOutputs.rate.value.low !== hypoOutputs.rate.value.low}
          />
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        This exploration doesn't change your saved answers. Go back and answer the real question if you want to
        update your actual result.
      </p>
    </div>
  );
}

function ComparisonRow({ label, before, after, changed }: { label: string; before: string; after: string; changed: boolean }) {
  return (
    <div className="col-span-2 flex items-center justify-between border-b border-paper-line/60 py-1.5 last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right">
        <span className="text-ink-muted line-through">{changed ? before : ''}</span>{' '}
        <span className={`font-medium ${changed ? 'text-marigold-deep' : 'text-ink'}`}>{after}</span>
      </span>
    </div>
  );
}

function estimateIncome(a: Answers): number {
  if (a.incomeType === 'salaried' && typeof a.netMonthlyIncomeSalaried === 'number') {
    return a.netMonthlyIncomeSalaried;
  }
  if (typeof a.monthlyIncomeRangeLow === 'number') return a.monthlyIncomeRangeLow;
  throw new Error('Sensitivity exploration requires a known income answer.');
}
