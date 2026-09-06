import { useBorrowerSession } from '../state/borrowerSession';
import { NegotiationCard } from '../components/NegotiationCard';

export function NegotiationCardScreen({ onBack }: { onBack: () => void }) {
  const { outputs, draft } = useBorrowerSession();

  if (!outputs) return null;

  return (
    <div className="min-h-[100dvh] px-6 py-8">
      <div className="mx-auto max-w-md">
        <button onClick={onBack} className="mb-6 text-sm text-ink-muted underline underline-offset-2 print:hidden">
          ← Back to results
        </button>
        <NegotiationCard answers={draft} result={outputs} />
        <button
          onClick={() => window.print()}
          className="mt-6 w-full rounded-xl border border-ink px-6 py-3 text-base font-medium text-ink print:hidden"
        >
          Print / save as PDF
        </button>
      </div>
    </div>
  );
}
