import type { Progress } from '../questions/questionEngine';

export function ProgressBar({ progress }: { progress: Progress }) {
  const corePct = progress.coreTotal > 0 ? (progress.coreAnswered / progress.coreTotal) * 100 : 0;
  return (
    <div className="w-full">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-line">
        <div
          className="h-full rounded-full bg-marigold transition-all duration-300"
          style={{ width: `${corePct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {progress.coreAnswered} of {progress.coreTotal} essential questions
        {progress.adaptiveRelevant > 0 && (
          <> · {progress.adaptiveAnswered} of {progress.adaptiveRelevant} optional answered</>
        )}
      </p>
    </div>
  );
}
