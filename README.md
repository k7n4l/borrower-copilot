# Borrower Copilot

A self-assessment tool that helps a borrower answer four questions before they walk into a lender: *Should I borrow at all? How much am I really eligible for? What's a fair rate for me? What EMI should I agree to?* It ends in a one-page **Negotiation Card** the borrower can hold up against a lender's quote.

No login. No backend. No data stored anywhere — everything runs in the browser from what you tell it.

## Quick start

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). That's it — no environment variables, no API keys, no database.

To build a production bundle:

```bash
npm run build
```

This runs `tsc -b` (typecheck) followed by `vite build`, and fails if either step fails. Output goes to `dist/`.

To run the test suite:

```bash
npm test
```

63 tests across the EMI/IRR math, the affordability engine, the three golden persona fixtures, the adaptive question flow, a live-assumption-change check, and two full end-to-end UI tests (a happy-path walkthrough and the interactive "What would change this?" sensitivity screen) that actually render the app and click through real flows.

## What's in this repo

| Path | What |
|---|---|
| `RULES.md` | Every threshold, formula, and assumption, in a `Rule · What · Value · Why · Source` table. Read this alongside the code — it's not a separate spec that could drift, it's a direct walk of `src/rules/constants.ts`. |
| `RUNTHROUGHS.md` | The three required borrower run-throughs (Priya, Ravi, Anita), with exact questions asked/skipped and the app's actual computed output for each. |
| `src/rules/` | The deterministic rules engine — pure functions, no React, no network, no ML. `engine.ts` is the single entry point (`computeOutputs(answers)`); every screen renders from its output and never calculates anything itself. |
| `src/questions/` | The adaptive question definitions (core + adaptive tiers) and the engine that decides what's relevant next based on prior answers. |
| `src/state/borrowerSession.tsx` | React Context + reducer holding the current answer draft; the only place `computeOutputs()` is called. |
| `src/components/`, `src/screens/` | UI only — landing, questionnaire, results, and the Negotiation Card. No financial arithmetic lives here. |
| `src/data/personas.ts` | The three fixtures, encoding *only* what the Lokta brief states about Priya, Ravi, and Anita — anything the brief doesn't give is left `'unknown'`, not invented. |
| `src/tests/` | Unit tests for the math and rules engine, golden tests for the three personas, an adaptive-question-flow test, a live-assumption-change test, and an end-to-end UI test. |

## How it works, in one paragraph

You answer up to ~10 "must" questions (purpose, amount, income, existing debt, expenses, age, credit score, recent payment issues) and a smaller adaptive set that only appears when it's actually relevant to your profile — a salaried IT employee and a self-employed shop owner see different follow-ups. Every answer flows into `computeOutputs()`, a single pure function that returns four outputs (Borrow / Borrow less / Don't borrow; a safe amount vs. an illustrative lender-likely amount; a fair rate band and all-in APR; a safe EMI with tenure trade-offs and a stress case), each carrying its own confidence level, plain-English explanation, and the rule IDs that produced it. The Negotiation Card is generated from that same result — nothing is recalculated for it.

## Design decisions worth knowing about

- **"Unknown" is never treated as zero, false, or a worst-case value.** It's a distinct type (`Unknown<T> = T | 'unknown'`) that survives all the way from the question answer to the final explanation shown on screen. See `RULES.md` §11 and the tests in `src/tests/affordability.test.ts` and `src/tests/questionFlow.test.ts`.
- **Safe amount and lender-likely amount are genuinely different calculations**, not the same number labelled twice — see Ravi's run-through for the clearest example, where his lender-facing income anchors to his ITR figure while his safe-side income uses his own (lower, more conservative) cash estimate.
- **Collateral changes the route and the rate, not the affordability check.** Ravi's ₹45,00,000 unencumbered property gets him routed to a secured loan with a better rate, but his safe amount is still capped by his income, not his property value — see `RULES.md` §4 and §10.
- **All-in APR is computed via actual cash-flow IRR** (`src/utils/emi.ts`), not a linear `nominal + fee/tenure` approximation — this is deliberately more honest, and it means the effective annualised rate is slightly higher than the nominal rate even before fees, purely from monthly compounding (see `RULES.md` §6 for the worked explanation).
- **No ML, no bureau integration, no backend** — explicitly out of scope per the brief, and beside the point: the exercise is about making lending judgement legible as rules, not about model accuracy.

## A note on the numbers

Rate bands, LTV caps, and tenure limits in `RULES.md` are **illustrative planning figures**, clearly labelled as such — they should be verified against current market data before any real-world use. The three run-throughs are not meant to match an unknown internal answer key; several inputs (Priya's and Anita's exact household expenses, Anita's exact existing EMI, whether Ravi's wife is a confirmed co-applicant) are genuinely left unknown because the brief doesn't specify them, and the app is designed to be honestly less confident — not silently wrong — when that happens.

## Walkthrough (~5 minutes)

If you're reviewing this as a submission, here's the suggested path:

1. **0:00–0:30** — what the app does and why (borrower-first framing, see the brief's own framing above).
2. **0:30–1:30** — Priya live: a comfortable "Borrow" verdict, safe vs. lender-likely amounts genuinely differing.
3. **1:30–2:30** — Ravi live: the secured-routing decision (`RULES.md` §10, `RUNTHROUGHS.md`), and the co-applicant sensitivity toggle as a live "change an assumption" demo.
4. **2:30–3:15** — Anita live: "Don't borrow" firing from the distress-flag combination rather than the amount gap, and the honest disclosure of her O2 numbers even though the headline verdict is negative.
5. **3:15–4:00** — a quick tour: a rule in `constants.ts`, its row in `RULES.md`, its assertion in a test.
6. **4:00–4:45** — what's next / what was deliberately cut (`RULES.md` §13).

## What I'd build next

- Full gold-loan and home-loan UI flows (currently config stubs only, since none of the three required personas need them).
- A more granular "existing loan detail" UI capture (currently a simplified count + highest-rate input) to match the richer `existingLoanDetail` type already in the rules engine.
- More sliders on the "What would change this?" screen (currently household expenses, existing EMI, credit score, and co-applicant — recent-bounce resolution and collateral value would be natural additions).

## What I'd cut first under more time pressure

Visual polish, animation, and broader product coverage — all explicitly de-prioritised by the brief's own scoring weights, which put 70 of 100 points on domain reasoning, question design, and explainability rather than engineering or craft.
