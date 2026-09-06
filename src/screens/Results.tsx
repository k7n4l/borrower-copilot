import { useBorrowerSession } from '../state/borrowerSession';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { Assumptions, RuleRefs } from '../components/Assumptions';
import { formatINR, formatPct } from '../utils/currency';
import type { Verdict } from '../rules/types';

const VERDICT_LABEL: Record<Verdict, string> = {
  borrow: 'Borrow',
  borrow_less: 'Borrow less',
  dont_borrow: "Don't borrow right now",
};

const VERDICT_STYLE: Record<Verdict, string> = {
  borrow: 'bg-borrow-bg text-borrow',
  borrow_less: 'bg-borrow-less-bg text-borrow-less',
  dont_borrow: 'bg-dont-borrow-bg text-dont-borrow',
};

export function Results({ onViewCard, onEditAnswers }: { onViewCard: () => void; onEditAnswers: () => void }) {
  const { outputs } = useBorrowerSession();

  if (!outputs) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <p className="text-ink-soft">Answer a few more questions to see your results.</p>
        <button onClick={onEditAnswers} className="mt-4 text-sm underline">
          Back to questions
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-8 pb-16">
      {/* O1 — Your decision */}
      <section>
        <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${VERDICT_STYLE[outputs.verdict.value]}`}>
          {VERDICT_LABEL[outputs.verdict.value]}
        </span>
        <p className="mt-3 font-display text-2xl leading-snug text-ink">{outputs.verdict.explanation}</p>
        <div className="mt-2">
          <ConfidenceBadge level={outputs.overallConfidence} />
        </div>
        {outputs.verdict.distressFlags.map((flag, i) => (
          <p key={i} className="mt-3 rounded-lg bg-dont-borrow-bg px-3 py-2 text-sm text-dont-borrow">
            {flag}
          </p>
        ))}
        <RuleRefs refs={outputs.verdict.ruleRefs} />
        <Assumptions items={outputs.verdict.assumptionsUsed} />
      </section>

      {/* O2 — Safe vs lender-likely amount */}
      <section className="mt-8 border-t border-paper-line pt-6">
        <p className="text-xs uppercase tracking-wide text-ink-muted">How much</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-ink-muted">Safe for you</p>
            <p className="tabular font-display text-2xl text-marigold-deep">{formatINR(outputs.amount.borrowerSafeAmount.value)}</p>
            <p className="mt-1 text-xs text-ink-muted">Use this one</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Lender may offer</p>
            <p className="tabular font-display text-2xl text-ink">{formatINR(outputs.amount.lenderLikelyAmount.value)}</p>
            <p className="mt-1 text-xs text-ink-muted">Can be more than safe</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-soft">{outputs.amount.borrowerSafeAmount.explanation}</p>
        <RuleRefs refs={outputs.amount.borrowerSafeAmount.ruleRefs} />
        <Assumptions items={outputs.amount.borrowerSafeAmount.assumptionsUsed} />
      </section>

      {/* O3 — Fair rate + APR */}
      <section className="mt-8 border-t border-paper-line pt-6">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Fair rate</p>
        <p className="mt-1 font-display text-2xl text-ink">
          {formatPct(outputs.rate.value.low)} – {formatPct(outputs.rate.value.high)}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Illustrative all-in APR: <span className="tabular font-medium">{formatPct(outputs.apr.value)}</span> — {outputs.apr.explanation}
        </p>
        <RuleRefs refs={[...outputs.rate.ruleRefs, ...outputs.apr.ruleRefs]} />
        <Assumptions items={[...outputs.rate.assumptionsUsed, ...outputs.apr.assumptionsUsed]} />
      </section>

      {/* O4 — Safe EMI, tenure, stress */}
      <section className="mt-8 border-t border-paper-line pt-6">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Safe monthly EMI</p>
        <p className="tabular mt-1 font-display text-2xl text-ink">{formatINR(outputs.affordability.safeEmiCeiling.value)}/mo</p>
        <p className="mt-2 text-sm text-ink-soft">{outputs.affordability.safeEmiCeiling.explanation}</p>

        <div className="mt-4 space-y-2">
          {outputs.tenure.options.map((o) => (
            <div
              key={o.label}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                o.label === outputs.tenure.recommended ? 'border-marigold bg-marigold/5' : 'border-paper-line'
              }`}
            >
              <span>
                {o.label} · {o.years}y{o.label === outputs.tenure.recommended && ' — recommended'}
              </span>
              <span className="tabular">{formatINR(o.emi)}/mo</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-muted">{outputs.tenure.explanation}</p>

        <div className="mt-4 rounded-lg bg-paper-raised px-3 py-3 text-sm text-ink-soft">
          <p className="font-medium text-ink">Stress case</p>
          <p className="mt-1">{outputs.stress.explanation}</p>
        </div>
        <Assumptions items={outputs.affordability.safeEmiCeiling.assumptionsUsed} />
      </section>

      {/* Product recommendation */}
      <section className="mt-8 border-t border-paper-line pt-6">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Recommended product</p>
        <p className="mt-1 font-display text-xl capitalize text-ink">{outputs.productRouting.value.replace(/_/g, ' ')}</p>
        <p className="mt-2 text-sm text-ink-soft">{outputs.productRouting.explanation}</p>
        <Assumptions items={outputs.productRouting.assumptionsUsed} />
      </section>

      {/* Assumptions / confidence summary */}
      {outputs.materialUnknowns.length > 0 && (
        <section className="mt-8 rounded-lg border border-paper-line bg-paper-raised px-4 py-3">
          <p className="text-sm font-medium text-ink">This estimate could get sharper</p>
          <p className="mt-1 text-sm text-ink-soft">
            We don't know your {outputs.materialUnknowns.join(', ').replace(/([A-Z])/g, ' $1').toLowerCase()}. Answering those
            would tighten these numbers.
          </p>
          <button onClick={onEditAnswers} className="mt-2 text-sm font-medium text-marigold-deep underline underline-offset-2">
            Answer more questions
          </button>
        </section>
      )}

      <button
        onClick={onViewCard}
        className="mt-8 w-full rounded-xl bg-ink px-6 py-4 text-base font-medium text-paper transition hover:bg-ink-soft"
      >
        Open my Negotiation Card
      </button>

      <p className="mt-6 text-center text-xs text-ink-muted">
        This is a planning estimate, not a lender approval or credit decision. Rates, eligibility rules and fees vary
        by lender.
      </p>
    </div>
  );
}
