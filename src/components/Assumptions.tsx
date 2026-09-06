export function Assumptions({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <details className="mt-2 rounded-lg border border-paper-line bg-paper-raised/60 px-3 py-2 text-sm text-ink-soft">
      <summary className="cursor-pointer select-none font-medium text-ink">
        Why this number is an estimate
      </summary>
      <ul className="mt-2 list-disc space-y-1.5 pl-4">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

export function RuleRefs({ refs }: { refs: string[] }) {
  if (refs.length === 0) return null;
  return (
    <p className="mt-1 text-xs text-ink-muted">
      Rules applied:{' '}
      {refs.map((r, i) => (
        <span key={r}>
          <code className="rounded bg-paper px-1 py-0.5">{r}</code>
          {i < refs.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  );
}
