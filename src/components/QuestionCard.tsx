import { useState } from 'react';
import type { QuestionDef } from '../questions/schema';

interface Props {
  question: QuestionDef;
  onAnswer: (raw: unknown) => void;
}

const inputBase =
  'w-full rounded-lg border border-paper-line bg-paper-raised px-4 py-3 text-base text-ink outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/30';

export function QuestionCard({ question, onAnswer }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-xl leading-snug text-ink">{question.prompt}</p>
        {question.helpText && <p className="mt-1.5 text-sm text-ink-muted">{question.helpText}</p>}
      </div>

      <QuestionInput question={question} onAnswer={onAnswer} />

      <details className="text-sm text-ink-muted">
        <summary className="cursor-pointer select-none">Why are we asking this?</summary>
        <p className="mt-1.5">{question.reason}</p>
      </details>
    </div>
  );
}

function QuestionInput({ question, onAnswer }: Props) {
  // Composite / special-case inputs, keyed by id.
  if (question.id === 'monthlyIncomeRange') return <RangeInput onAnswer={onAnswer} />;
  if (question.id === 'existingLoanDetail') return <ExistingLoanDetailInput question={question} onAnswer={onAnswer} />;
  if (question.id === 'bounceDetail') return <BounceDetailInput onAnswer={onAnswer} />;
  if (question.id === 'collateral') return <CollateralInput onAnswer={onAnswer} />;

  switch (question.controlType) {
    case 'single_select':
      return <SelectInput question={question} onAnswer={onAnswer} />;
    case 'currency_number':
      return <CurrencyInput question={question} onAnswer={onAnswer} />;
    case 'number':
      return <NumberInput question={question} onAnswer={onAnswer} />;
    case 'yes_no_unknown':
      return <YesNoUnknownInput question={question} onAnswer={onAnswer} />;
    case 'boolean':
      return <BooleanInput onAnswer={onAnswer} />;
    case 'credit_score_or_unknown':
      return <CreditScoreInput onAnswer={onAnswer} />;
    default:
      return null;
  }
}

function SelectInput({ question, onAnswer }: Props) {
  return (
    <div className="grid gap-2">
      {question.options?.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onAnswer(opt.value)}
          className="rounded-lg border border-paper-line bg-paper-raised px-4 py-3 text-left text-ink transition hover:border-marigold hover:bg-marigold/5"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CurrencyInput({ question, onAnswer }: Props) {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer(value === '' ? 0 : Number(value));
      }}
      className="space-y-3"
    >
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">₹</span>
        <input
          type="number"
          inputMode="numeric"
          className={`${inputBase} pl-8`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-ink px-5 py-2.5 font-medium text-paper">
          Continue
        </button>
        {question.allowUnknown && (
          <button
            type="button"
            onClick={() => onAnswer('unknown')}
            className="rounded-lg border border-paper-line px-5 py-2.5 text-ink-soft hover:bg-paper-raised"
          >
            I don't know
          </button>
        )}
      </div>
    </form>
  );
}

function NumberInput({ question, onAnswer }: Props) {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer(value === '' ? 0 : Number(value));
      }}
      className="space-y-3"
    >
      <input
        type="number"
        inputMode="numeric"
        className={inputBase}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-ink px-5 py-2.5 font-medium text-paper">
          Continue
        </button>
        {question.allowUnknown && (
          <button
            type="button"
            onClick={() => onAnswer('unknown')}
            className="rounded-lg border border-paper-line px-5 py-2.5 text-ink-soft hover:bg-paper-raised"
          >
            I don't know
          </button>
        )}
      </div>
    </form>
  );
}

function RangeInput({ onAnswer }: { onAnswer: (raw: unknown) => void }) {
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer({ low: Number(low) || 0, high: Number(high) || Number(low) || 0 });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-ink-muted">Low month</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">₹</span>
            <input type="number" inputMode="numeric" className={`${inputBase} pl-8`} value={low} onChange={(e) => setLow(e.target.value)} autoFocus />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-muted">High month</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">₹</span>
            <input type="number" inputMode="numeric" className={`${inputBase} pl-8`} value={high} onChange={(e) => setHigh(e.target.value)} />
          </div>
        </div>
      </div>
      <button type="submit" className="rounded-lg bg-ink px-5 py-2.5 font-medium text-paper">
        Continue
      </button>
    </form>
  );
}

function YesNoUnknownInput({ question, onAnswer }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button onClick={() => onAnswer(true)} className="rounded-lg border border-paper-line bg-paper-raised py-3 hover:border-marigold">
        Yes
      </button>
      <button onClick={() => onAnswer(false)} className="rounded-lg border border-paper-line bg-paper-raised py-3 hover:border-marigold">
        No
      </button>
      {question.allowUnknown && (
        <button onClick={() => onAnswer('unknown')} className="rounded-lg border border-paper-line bg-paper-raised py-3 text-ink-soft hover:border-marigold">
          Not sure
        </button>
      )}
    </div>
  );
}

function BooleanInput({ onAnswer }: { onAnswer: (raw: unknown) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => onAnswer(true)} className="rounded-lg border border-paper-line bg-paper-raised py-3 hover:border-marigold">
        Yes
      </button>
      <button onClick={() => onAnswer(false)} className="rounded-lg border border-paper-line bg-paper-raised py-3 hover:border-marigold">
        No
      </button>
    </div>
  );
}

function CreditScoreInput({ onAnswer }: { onAnswer: (raw: unknown) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value !== '') onAnswer(Number(value));
        }}
        className="flex gap-2"
      >
        <input
          type="number"
          inputMode="numeric"
          placeholder="e.g. 750"
          className={inputBase}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="shrink-0 rounded-lg bg-ink px-5 py-2.5 font-medium text-paper">
          Continue
        </button>
      </form>
      <div className="flex gap-2">
        <button
          onClick={() => onAnswer('no_score')}
          className="flex-1 rounded-lg border border-paper-line px-4 py-2.5 text-sm text-ink-soft hover:bg-paper-raised"
        >
          No credit history
        </button>
        <button
          onClick={() => onAnswer('unknown')}
          className="flex-1 rounded-lg border border-paper-line px-4 py-2.5 text-sm text-ink-soft hover:bg-paper-raised"
        >
          I don't know
        </button>
      </div>
    </div>
  );
}

function ExistingLoanDetailInput({ onAnswer }: Props) {
  const [count, setCount] = useState('');
  const [rate, setRate] = useState('');
  const [rateUnknown, setRateUnknown] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer({
          count: Number(count) || 0,
          highestRateApprox: rateUnknown || rate === '' ? 'unknown' : Number(rate) / 100,
        });
      }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs text-ink-muted">Number of active loans</label>
        <input type="number" inputMode="numeric" className={inputBase} value={count} onChange={(e) => setCount(e.target.value)} autoFocus />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-muted">Highest interest rate (% per year, approx.)</label>
        <input
          type="number"
          inputMode="numeric"
          disabled={rateUnknown}
          className={`${inputBase} disabled:opacity-50`}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={rateUnknown} onChange={(e) => setRateUnknown(e.target.checked)} />
          I don't know the rate
        </label>
      </div>
      <button type="submit" className="rounded-lg bg-ink px-5 py-2.5 font-medium text-paper">
        Continue
      </button>
      <button
        type="button"
        onClick={() => onAnswer('unknown')}
        className="ml-2 rounded-lg border border-paper-line px-5 py-2.5 text-ink-soft hover:bg-paper-raised"
      >
        Skip — I don't know
      </button>
    </form>
  );
}

function BounceDetailInput({ onAnswer }: { onAnswer: (raw: unknown) => void }) {
  const [times, setTimes] = useState('1');
  const [resolved, setResolved] = useState<boolean | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-ink-muted">How many times in the last 12 months?</label>
        <input
          type="number"
          inputMode="numeric"
          className={inputBase}
          value={times}
          onChange={(e) => setTimes(e.target.value)}
        />
      </div>
      <div>
        <p className="mb-2 text-sm text-ink-soft">Is it resolved now (caught up / no longer overdue)?</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setResolved(true)}
            className={`rounded-lg border py-3 ${resolved === true ? 'border-marigold bg-marigold/10' : 'border-paper-line bg-paper-raised'}`}
          >
            Yes, resolved
          </button>
          <button
            onClick={() => setResolved(false)}
            className={`rounded-lg border py-3 ${resolved === false ? 'border-marigold bg-marigold/10' : 'border-paper-line bg-paper-raised'}`}
          >
            Still pending
          </button>
        </div>
      </div>
      <button
        disabled={resolved === null}
        onClick={() => onAnswer({ timesInLast12Months: Number(times) || 1, resolved: resolved as boolean })}
        className="rounded-lg bg-ink px-5 py-2.5 font-medium text-paper disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}

function CollateralInput({ onAnswer }: { onAnswer: (raw: unknown) => void }) {
  const [has, setHas] = useState<boolean | null>(null);
  const [type, setType] = useState<'property' | 'gold' | 'vehicle' | 'other'>('property');
  const [value, setValue] = useState('');
  const [encumbered, setEncumbered] = useState(false);

  if (has === null) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setHas(true)} className="rounded-lg border border-paper-line bg-paper-raised py-3 hover:border-marigold">
          Yes
        </button>
        <button onClick={() => onAnswer('unknown')} className="rounded-lg border border-paper-line bg-paper-raised py-3 hover:border-marigold">
          No / not sure
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer({ type, estimatedValue: Number(value) || 0, encumbered });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-3 gap-2">
        {(['property', 'gold', 'vehicle'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-lg border py-2.5 text-sm capitalize ${type === t ? 'border-marigold bg-marigold/10' : 'border-paper-line bg-paper-raised'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-muted">Estimated value</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">₹</span>
          <input type="number" inputMode="numeric" className={`${inputBase} pl-8`} value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={encumbered} onChange={(e) => setEncumbered(e.target.checked)} />
        This already has a loan/lien against it
      </label>
      <button type="submit" className="rounded-lg bg-ink px-5 py-2.5 font-medium text-paper">
        Continue
      </button>
    </form>
  );
}
