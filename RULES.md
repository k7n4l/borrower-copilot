# RULES.md — Borrower Copilot

This document lists every threshold, formula, and assumption used by the app. Every rule ID below (`INC-01`, `AFF-04`, `VER-02`, etc.) appears **verbatim** in `src/rules/constants.ts` and in the `ruleRefs` array attached to the number it produces on screen — click "Rules applied" or "Why this number is an estimate" in the app to see the same IDs.

**Nothing in this document is a claim about actual RBI regulation or any specific lender's underwriting policy**, unless explicitly cited. Where a value is our own planning judgement rather than an external fact, the Source column says `my judgement`. Where a value is illustrative and should be checked against live market data before real use, it says `illustrative, verify`.

---

## 1. Income normalisation (`INC-xx`)

| Rule | What | Value | Why | Source |
|---|---|---|---|---|
| INC-01 | Salaried reliable income | Stated net take-home, used as-is | Directly verifiable via payslip/bank statement in a real product | Fact (definitional) |
| INC-01 | Self-employed reliable income | Low end of the borrower's stated monthly range | A self-reported range is unverified; planning off the low end protects against over-committing against income that may not recur | My judgement |
| INC-02 | Informal-income reliable income | Low end of stated range (same treatment as INC-01 for self-employed) | Same rationale — income volatility, no documentation | My judgement |
| INC-03 | Self-employed lender-likely income anchor | Last filed ITR annual income ÷ 12 | This is what a lender can actually verify; can be materially lower than the cash estimate — this gap is exactly what makes the safe-vs-lender-likely divergence meaningful for a borrower like Ravi | My judgement, informed by common documented-income underwriting practice |
| INC-03 | Self-employed lender-likely income, ITR unknown | 70% of the stated low-end cash income, flagged, confidence forced to Low | Never silently assume ₹0 or the full cash estimate when ITR isn't provided | My judgement (explicit placeholder, not a lender fact) |
| INC-03 | Informal lender-likely income | Same as reliable income (no separate documented-income channel exists for informal work in this model) | There's no ITR-equivalent to anchor to | My judgement |
| INC-04 | Co-applicant inclusion | Only if `hasCoApplicant === true`, explicitly confirmed by the borrower | A household member's income is never assumed just because it's mentioned — the borrower must confirm they're formally applying jointly | Product judgement |
| INC-05a | Co-applicant recognition — borrower-safe calculation | 60% of confirmed co-applicant income | Conservative: we don't know the co-applicant's own obligations, so we don't want the borrower's personal safety margin to lean on the full amount | My judgement, **not** a lender/RBI rule |
| INC-05b | Co-applicant recognition — lender-likely calculation | 80% of confirmed co-applicant income | Illustrative proxy for how a lender might view combined repayment capacity — deliberately different from INC-05a because real lenders vary widely here | Illustrative, verify with the specific lender/product |
| — | Co-applicant income unknown | Contributes ₹0 in both calculations (never guessed) | Same "unknown ≠ zero/guessed value" principle applied to a positive number: we don't invent income any more than we invent debt | My judgement |

## 2. Affordability — FOIR + residual hybrid (`AFF-xx`)

The safe EMI ceiling is the **stricter (lower)** of two independent checks — a FOIR-style debt-service check and a residual-income check. This hybrid exists because FOIR alone can look compliant on paper while leaving too little to actually live on, especially for thinner-margin segments (see the Ravi and Anita run-throughs).

| Rule | What | Value | Why | Source |
|---|---|---|---|---|
| AFF-01 | FOIR ceiling — salaried, income < ₹50,000/mo | 40% of income | Lower planning ceiling for the thinnest salaried incomes | My judgement / common planning convention — **not** an RBI-mandated figure (RBI does not fix a single FOIR %) |
| AFF-01 | FOIR ceiling — salaried, ₹50,000–₹1,00,000/mo | 45% of income | Mid-tier planning ceiling | My judgement |
| AFF-01 | FOIR ceiling — salaried, > ₹1,00,000/mo | 50% of income | Higher income affords a larger debt-service share | My judgement |
| AFF-01 | FOIR ceiling — self-employed | 35% flat, regardless of income level | Volatility risk doesn't shrink just because stated income is higher | My judgement |
| AFF-01 | FOIR ceiling — informal | 30% flat | Highest caution tier — least verifiable, most volatile income | My judgement |
| AFF-02 | Residual safety buffer | 15% of effective income, deducted before computing residual room for a new EMI | Protects against a technically-FOIR-compliant EMI that still leaves too little real margin | My judgement |
| AFF-03 | Combining rule | Safe EMI ceiling = MIN(FOIR-based ceiling, residual-based ceiling) | The stricter check should always win — this is a safety tool, not an eligibility maximiser | Product judgement |
| AFF-04 | Existing EMI unknown | **Never treated as ₹0.** Modelled as a range: 5%–20% of income (central 10%), producing a genuine low/central/high range for the safe ceiling rather than a single invented number. The original answer stays `'unknown'` in the data. | Overstating affordability (via an assumed-zero debt burden) is the unsafe direction; a single invented point would be false precision | My judgement — deliberately wide, not survey-derived |
| AFF-05 | Household expenses unknown | Same treatment: range 35%–55% of income (central 45%) | Same rationale as AFF-04 | My judgement — deliberately wide, not survey-derived |

## 3. Borrow / Borrow less / Don't borrow (`VER-xx`)

| Rule | What | Value | Why | Source |
|---|---|---|---|---|
| VER-01 | Hard "Don't borrow" | Safe EMI ceiling ≤ 0 | No safe room exists in the budget, full stop | Direct mathematical consequence of AFF-01–03 |
| VER-02 | Hard-stop combination | Unresolved recent bounce **AND** (existing debt at ≥24% APR **OR** 3+ active loans) → "Don't borrow" | This specific combination is a materially more urgent situation than either signal alone — active repayment distress, not just elevated risk | My judgement |
| VER-03 | "Borrow less" margin | If EMI at the requested amount exceeds the safe ceiling by more than 10%, verdict is "Borrow less" and the fitting amount is shown instead | A gap this size reflects a real shortfall rather than estimation noise in our own income/expense inputs (see VER-04 rationale) | My judgement — see VER-04 |
| VER-04 | Rationale for the 10% margin | *(text, not a number)* | "A small (≤10%) gap between the requested EMI and the safe ceiling is treated as within planning tolerance because our income and expense inputs are themselves estimates, not verified figures; a gap larger than that is a real affordability shortfall, not rounding noise." | My judgement, stated explicitly so it's defensible if challenged live |
| VER-05 | Anti-overreaction rule | A single isolated negative signal (e.g. unknown score alone, or a resolved old bounce alone) never by itself forces "Don't borrow" — only VER-01 or the VER-02 combination do | Prevents one weak signal from producing a disproportionate verdict | Product judgement |

## 4. Safe amount vs. lender-likely amount (`AMT-xx`)

Both figures use the standard reducing-balance EMI formula, solved for principal:

```
EMI = P × r × (1+r)^n / ((1+r)^n − 1)
```

| Rule | What | Value | Why | Source |
|---|---|---|---|---|
| AMT-SAFE-01 | Borrower-safe amount | Principal such that EMI = safe EMI ceiling, at the fair-rate midpoint and standard (Balanced) tenure | The number the borrower should actually use | Direct mathematical consequence of AFF-01–05 |
| AMT-LENDER-01 | Lender-likely amount | Principal such that EMI = 50% of *lender-facing* income minus existing EMI (a looser, income-only proxy — no household-expense deduction), capped by an LTV limit for secured products if collateral is present | Lenders typically underwrite primarily against documented income and FOIR, without the fuller expense picture our safe-side check uses | Illustrative planning proxy — **not** an actual lender's formula or a guarantee of sanction |
| — | LTV cap application | If `estimatedValue × LTV_CEILING[product]` is lower than the income-based lender-likely figure, the LTV figure is used instead | Collateral raises the ceiling but never bypasses it — this is what keeps Ravi's numbers honest (affordability still binds even with ₹45L of property) | Illustrative — verify current lender/RBI-linked LTV caps |

## 5. Fair rate bands (`RATE-xx`)

Base planning bands by product/segment — **all illustrative, verify against current market quotes before any real use:**

| Product / segment | Band | Why |
|---|---|---|
| Personal loan, strong salaried | 10.5%–13% | Stable, verifiable income; good score |
| Personal loan, self-employed / thin file | 14%–18% | Unsecured lenders price in verification and default risk |
| Loan against property | 9.5%–12% | Secured by immovable property |
| Business loan, secured | 10%–13% | Similar risk to LAP, plus business cash-flow variability |
| Gold loan | 9%–14% | Highly liquid collateral, fast recovery |
| Two-wheeler loan | 10%–14% | Asset-backed but depreciating, small-ticket |
| Home loan | 8%–9.5% | Lowest-risk category for lenders |

Adjustments applied on top of the base band:

| Rule | What | Value | Why | Source |
|---|---|---|---|---|
| RATE-01 | Unknown / no credit score | Widens **both** ends of the band by 75 bps, forces confidence to Low | An unknown score must never be treated as a bad score | My judgement |
| RATE-02 | Unresolved recent bounce | Shifts the low end by +150 bps and the high end by +200 bps | Materially different (more urgent) risk signal than "unknown" | My judgement |
| RATE-03 | Strong score (≥750) | Tightens both ends by 50 bps | Rewards a demonstrably strong, verifiable credit history | My judgement |

## 6. All-in APR (`APR-xx`)

| Rule | What | Value | Why | Source |
|---|---|---|---|---|
| APR-01 | Processing fee assumption | 2% of principal, when not otherwise specified | Illustrative — shows the borrower how fees affect all-in cost even without a specific lender quote | My judgement / illustrative |
| APR-02 | APR calculation method | Numerical IRR of actual borrower cash flows (disbursement net of fee, then monthly EMIs), annualised via bisection | Materially more honest than a linear `nominal + fee/tenure` approximation, which understates the true cost of an upfront fee charged against the full principal | Mathematical method, not an assumption |

**Important clarification — three numbers that are easy to conflate:**

1. **Nominal annual rate** — the quoted rate (e.g. "12% per annum"), applied monthly (1%/month) in the EMI formula.
2. **Effective annualised rate** — what that nominal rate actually compounds to over a year: `(1 + nominal/12)^12 − 1`. For a 12% nominal rate this is **≈12.68%**, not 12% — purely a consequence of monthly compounding, not a fee or a markup. This is a mathematical fact, verified directly in `src/tests/emi.test.ts`.
3. **All-in APR** (what the app shows as "illustrative APR") — the effective annualised rate **plus** the impact of the upfront processing fee. This is the number worth comparing across lenders, and it will always be ≥ the effective annualised rate, which is itself already ≥ the nominal rate.

The app deliberately does **not** force the zero-fee case back down to the nominal rate — that would be less accurate.

## 7. Tenure (`TEN-xx`)

| Rule | What | Value | Why | Source |
|---|---|---|---|---|
| TEN-01 | Three tenure options shown | Short = 50% of max tenure, Balanced = 75%, Long = 100% | Gives a real short/medium/long trade-off rather than an arbitrary spread | My judgement |
| TEN-02 | Max tenure by product (years) | Personal loan: 5 · LAP: 15 · Secured business: 10 · Gold: 3 · Two-wheeler: 5 · Home loan: 20 | Broadly typical product-level tenure ceilings | Illustrative, verify |
| TEN-03 | Max age at loan end | 65 | No recommended tenure should run past this age | My judgement |
| — | Recommendation logic | The shortest tenure option whose EMI still fits the safe ceiling is recommended (minimises total interest); if none fit, Long is shown as the least-bad option and the verdict/amount outputs carry the "borrow less" message instead | Balances affordability against total cost rather than optimising for the lowest EMI alone | Product judgement |

## 8. Stress testing (`STRESS-xx`)

| Rule | What | Value | Why | Source |
|---|---|---|---|---|
| STRESS-01 | Income-drop shock | 20% income reduction, applied to all products | Commonly used planning haircut — not a claim about this specific borrower's actual risk | My judgement |
| STRESS-02 | Rate-rise shock | +175 bps, applied only to typically-floating-rate products (LAP, home loan, secured business loan) | Fixed-rate products (personal, two-wheeler) don't carry this risk | My judgement |

## 9. Confidence (`CONF-xx`)

| Rule | What | Value | Why | Source |
|---|---|---|---|---|
| CONF-01 | Material fields | `existingMonthlyEMI`, `householdMonthlyExpenses`, `incomeStability` (non-salaried only), `creditScore`, `recentBounce`, `annualITRIncome` (self-employed only), `collateral` (secured-route only) | These are the fields that actually move O1–O4; everything else is informative but not confidence-bearing | Product judgement |
| CONF-02 | Thresholds | 0 material unknowns → High · 1 → Medium · 2+ → Low | Confidence tracks how many things that actually matter are missing — **not** the raw fraction of all optional questions answered | Product judgement |

## 10. Product routing (`ROUTE-xx`)

| Rule | What | Value | Why | Source |
|---|---|---|---|---|
| ROUTE-01 | Business purpose + unencumbered property collateral | Routes to Loan Against Property (or Business loan secured if collateral type isn't property) instead of an unsecured personal loan | Materially better rate and higher feasible amount for the same repayment capacity — this is the Ravi case | Product judgement, not a guarantee any specific lender offers this |
| ROUTE-02 | LTV ceiling (planning cap) | LAP / secured business: 50% · Gold: 75% · Home loan: 80% | Illustrative caps on how much of collateral value can be borrowed against | Illustrative — verify current lender/RBI-linked caps (e.g. gold loan LTV is RBI-linked and changes over time) |
| ROUTE-03 | Vehicle purpose, ticket ≤ ₹3,00,000 | Routes to two-wheeler hypothecation instead of unsecured personal loan | Vehicle-hypothecated loans are typically cheaper for this ticket size | My judgement |
| — | Explicit borrower product hint | If the borrower already named a specific product, it's respected directly rather than re-derived from purpose | The borrower may know their situation better than a purpose-code heuristic | Product judgement |

## 11. Unknown handling — summary

This principle appears throughout the model above, but stated once, plainly: **an "unknown" answer is never converted to 0, `false`, or a punitive worst-case value anywhere in this app.** Concretely:

- Unknown existing EMI / household expenses → a documented **range** of plausible values (AFF-04/05), never a silent zero.
- Unknown / no credit score → a **wider** rate band (RATE-01), never treated as a bad score.
- Unknown co-applicant income → contributes **₹0** (not guessed), same principle applied to a positive figure.
- Unknown ITR income (self-employed) → a flagged, heavily-discounted placeholder for the lender-likely figure, with confidence forced to Low — never silently assumed equal to the cash estimate.
- The original answer field is never mutated to remove the `'unknown'` marker — only the calculation layer uses an internal fallback range, and the UI's "Why this number is an estimate" panel always discloses when this has happened.

This is enforced at the type level: every field that can legitimately be unknown is typed `Unknown<T> = T | 'unknown'` in `src/rules/types.ts`, and verified by dedicated tests (`src/tests/affordability.test.ts`, `src/tests/questionFlow.test.ts`) that assert the original answer remains `'unknown'` after computation.

## 12. Question → output mapping

Every question in the app carries its own `affects: string[]` field listing exactly which rule IDs / outputs it can move — see `src/questions/coreQuestions.ts` and `src/questions/adaptiveQuestions.ts`. This mapping is not a separate document that could drift from the code; it *is* the code, and the app's own "Why are we asking this?" panel on each question renders it directly. If a question doesn't list at least one rule ID it can move, it was cut during design (see the deliberately-omitted questions below).

## 13. What we deliberately did not build

- **A "rent vs. own" question** — folds into household expenses; asking it separately wouldn't move any output on its own.
- **"Offers already received" as an output-affecting input** — useful context for a real negotiation, but it doesn't change O1–O4, so it isn't counted among the questions that "move an output," per the brief's own standard for cutting non-material questions.
- **A true actuarial/XIRR solver** for APR beyond the IRR-via-bisection method already implemented — the current method is already materially more honest than a linear approximation; a full day-count-convention solver would be marginal additional accuracy for a 12–16 hour build.
- **Gold loan and home loan UI flows** — config stubs only (rate band + LTV cap documented above), since none of the three required personas need them. Not scored, per the brief.
- **Any ML/statistical model** — explicitly out of scope; every number here traces to a named, readable rule, which is the entire point of the exercise.

## 14. Known limitations

- Rate bands, tenure caps, and LTV ceilings are **illustrative planning figures**, not live market data — they should be verified against current lender quotes before any real-world use.
- The "lender-likely" amount and rate are **not a guarantee** of what any specific lender will offer; they are our own proxy for typical underwriting behaviour.
- The residual-income and FOIR percentages are our own safety-planning judgement, not universal or RBI-mandated figures.
- The APR calculation includes only the processing fee; it does not model insurance add-ons, stamp duty, or other charges a specific lender might levy — the app explicitly tells the borrower to ask about these (see the Negotiation Card).
- Confidence and ranges are driven by which *material* fields are missing, not a statistical uncertainty model — this is a transparent heuristic, not a calibrated probability.
