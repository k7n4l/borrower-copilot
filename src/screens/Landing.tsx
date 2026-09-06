export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col justify-between px-6 py-10">
      <div />
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-medium text-marigold-deep">Before you walk into a lender</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.1] text-ink">
          Know what's fair, before someone else decides for you.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          Answer a few honest questions about your income and expenses. We'll show you whether to borrow, how much
          is actually safe, and what a fair rate looks like — so you're not the least-informed person in the room.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-ink-soft">
          <li className="flex gap-2">
            <span className="text-marigold">—</span> No login. No data stored. Nothing sent anywhere.
          </li>
          <li className="flex gap-2">
            <span className="text-marigold">—</span> Every number comes with a one-line reason.
          </li>
          <li className="flex gap-2">
            <span className="text-marigold">—</span> "Don't borrow" is a real, honest answer here.
          </li>
        </ul>
        <button
          onClick={onStart}
          className="mt-8 w-full rounded-xl bg-ink px-6 py-4 text-base font-medium text-paper transition hover:bg-ink-soft"
        >
          Start — takes about 3 minutes
        </button>
      </div>
      <p className="mx-auto max-w-md text-center text-xs text-ink-muted">
        This is a planning tool, not a lender or a credit decision.
      </p>
    </div>
  );
}
