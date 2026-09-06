import type { Confidence } from '../rules/types';

const STYLES: Record<Confidence, string> = {
  High: 'bg-borrow-bg text-borrow',
  Medium: 'bg-borrow-less-bg text-borrow-less',
  Low: 'bg-dont-borrow-bg text-dont-borrow',
};

export function ConfidenceBadge({ level, detail }: { level: Confidence; detail?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[level]}`}>{level} confidence</span>
      {detail && <span className="text-xs text-ink-muted">{detail}</span>}
    </div>
  );
}
