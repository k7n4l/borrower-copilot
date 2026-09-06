import { useBorrowerSession } from '../state/borrowerSession';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionCard } from '../components/QuestionCard';

export function Questionnaire({ onDone }: { onDone: () => void }) {
  const { nextQuestion, progress, answer, isCoreComplete } = useBorrowerSession();

  // No more relevant questions left (core + all currently-applicable
  // adaptive ones answered) — move on to results.
  if (!nextQuestion) {
    onDone();
    return null;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 py-8">
      <ProgressBar progress={progress} />

      <div className="mt-8 flex-1">
        <p className="mb-1 text-xs uppercase tracking-wide text-ink-muted">{nextQuestion.section}</p>
        <QuestionCard
          key={nextQuestion.id}
          question={nextQuestion}
          onAnswer={(raw) => answer(nextQuestion, raw)}
        />
      </div>

      {isCoreComplete && nextQuestion.tier === 'adaptive' && (
        <button onClick={onDone} className="mt-6 self-start text-sm text-ink-muted underline underline-offset-2">
          Skip remaining optional questions and see my results
        </button>
      )}
    </div>
  );
}
