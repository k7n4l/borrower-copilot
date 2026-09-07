import type { Answers, DecisionModel, Verdict } from '../rules/types';
import { formatINR, formatPct } from '../utils/currency';

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

const LENDER_QUESTIONS = [
  'What is the annual interest rate, and is it fixed or floating?',
  'What is the APR (all-in cost including fees)?',
  'What processing fee is charged, and is it refundable if I withdraw?',
  'What is the total repayment amount over the full tenure?',
  'Are there any insurance or add-on charges bundled in?',
  'What are the late-payment charges?',
  'What are the prepayment / foreclosure charges?',
  'Can I see the Key Fact Statement (KFS) and amortisation schedule?',
];

const RED_FLAGS = [
  "Don't compare loans by EMI alone — a lower EMI from a longer tenure can cost much more overall.",
  "Don't ignore processing fees and add-ons — that's the gap between the rate and the real APR.",
  "A lender approving more than your safe amount doesn't mean it's safe for you to take.",
];

/**
 * Renders entirely from computeOutputs() output + the answer draft — no
 * calculation happens here. This is deliberately the same shape whether
 * viewed inline in the Results screen or on its own printable screen.
 */
export function NegotiationCard({ answers, result }: { answers: Answers; result: DecisionModel }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border-2 border-ink bg-paper-raised p-6 shadow-sm print:shadow-none">
      <div className="flex items-center justify-between border-b border-paper-line pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Negotiation Card</p>
          <p className="font-display text-lg text-ink">Borrower Copilot</p>
        </div>
        <p className="text-xs text-ink-muted">{new Date().toLocaleDateString('en-IN')}</p>
      </div>

      <div className="mt-4">
        <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${VERDICT_STYLE[result.verdict.value]}`}>
          {VERDICT_LABEL[result.verdict.value]}
        </span>
        <p className="mt-2 text-sm text-ink-soft">{result.verdict.explanation}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-paper-line pt-4">
        <Stat label="You asked for" value={formatINR(answers.amountWanted)} />
        <Stat label="Safe amount" value={formatINR(result.amount.borrowerSafeAmount.value)} highlight />
        <Stat label="Lender may offer" value={formatINR(result.amount.lenderLikelyAmount.value)} />
        <Stat label="Safe EMI" value={formatINR(result.affordability.safeEmiCeiling.value) + '/mo'} highlight />
      </div>
      {result.amount.borrowerSafeAmount.range && (
        <p className="mt-2 text-xs text-ink-muted">
          Safe amount planning range: {formatINR(result.amount.borrowerSafeAmount.range.low)}–{formatINR(result.amount.borrowerSafeAmount.range.high)}. Use the central safe amount above.
        </p>
      )}
      {result.affordability.safeEmiCeiling.range && (
        <p className="mt-1 text-xs text-ink-muted">
          Safe EMI planning range: {formatINR(result.affordability.safeEmiCeiling.range.low)}–{formatINR(result.affordability.safeEmiCeiling.range.high)}/mo; do not exceed the central ceiling.
        </p>
      )}

      <div className="mt-4 border-t border-paper-line pt-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Fair rate for your profile</p>
        <p className="font-display text-2xl text-ink">
          {formatPct(result.rate.value.low)} – {formatPct(result.rate.value.high)}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Illustrative all-in APR (incl. fees): <span className="tabular font-medium">{formatPct(result.apr.value)}</span>
        </p>
        <p className="mt-1 text-xs text-ink-muted">Product: {result.productRouting.value.replace(/_/g, ' ')}</p>
      </div>

      <div className="mt-4 border-t border-paper-line pt-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Recommended tenure</p>
        <p className="text-sm text-ink-soft">
          {result.tenure.recommended} — {result.tenure.options.find((o) => o.label === result.tenure.recommended)?.years} years, about{' '}
          {formatINR(result.tenure.options.find((o) => o.label === result.tenure.recommended)?.emi ?? 0)}/month
        </p>
      </div>

      <div className="mt-4 border-t border-paper-line pt-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Stress case</p>
        <p className="text-sm text-ink-soft">{result.stress.explanation}</p>
      </div>

      {result.materialUnknowns.length > 0 && (
        <div className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs text-ink-muted">
          Estimated with some information missing ({result.materialUnknowns.length} item
          {result.materialUnknowns.length > 1 ? 's' : ''}) — overall confidence: {result.overallConfidence}.
        </div>
      )}

      <div className="mt-5 border-t border-paper-line pt-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Ask the lender</p>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
          {LENDER_QUESTIONS.map((q) => (
            <li key={q} className="flex gap-2">
              <span className="text-marigold">•</span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t border-paper-line pt-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Red flags</p>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
          {RED_FLAGS.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-dont-borrow">•</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-5 border-t border-paper-line pt-3 text-xs text-ink-muted">
        This is a planning estimate, not a lender approval or credit decision. Rates, eligibility and fees vary by
        lender — verify everything above before signing.
      </p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`tabular font-display text-lg ${highlight ? 'text-marigold-deep' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
