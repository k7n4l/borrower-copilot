# RUNTHROUGHS.md — Borrower Copilot

Every number below is the **actual output of `computeOutputs()`**, run against the persona fixtures in `src/data/personas.ts`, which encode only what the Lokta brief states about each borrower. Where the brief doesn't give a figure (Priya's total household expenses, Anita's exact EMI, Ravi's confirmed co-applicant status), it is left `'unknown'` in the fixture — nothing here is invented. You can reproduce every number below by running `npm test` or by opening the app and answering exactly as described in each "Questions asked" section.

Exact rupee figures are not meant to match an internal Lokta answer key — several of the inputs here are genuinely unknown, so the numbers are themselves estimates by design. What matters is that the reasoning is traceable.

---

## Priya — salaried, ₹8,00,000 for a wedding

**Profile (from the brief):** 29, Bengaluru, software engineer at an MNC for 5 years, net ₹1,10,000/month, car EMI ₹14,000/month, credit score 780, rents at ₹28,000/month.

### Questions asked
`purpose` → Wedding · `amountWanted` → ₹8,00,000 · `productHint` → not sure · `incomeType` → Salaried · `netMonthlyIncomeSalaried` → ₹1,10,000 · `existingMonthlyEMI` → ₹14,000 · `householdMonthlyExpenses` → **I don't know** *(the brief gives her rent, ₹28,000, but not her total household expenses — we do not assume rent = total expenses, so this is left unknown)* · `ageYears` → 29 · `creditScore` → 780 · `recentBounce` → No · `incomeTenureYears` → 5 years · `existingLoanDetail` → I don't know · `creditCardUtilisationPct` → I don't know · `emergencySavingsMonths` → I don't know · `upcomingLargeExpense` → I don't know · `collateral` → **asked** (her ₹8,00,000 ask exceeds the ₹5,00,000 collateral-relevance threshold, ROUTE's adaptive trigger) → she has none to offer · `hasCoApplicant` → No

### Questions skipped (and why)
- `monthlyIncomeRange`, `annualITRIncome`, `incomeStability` — salaried, not applicable.
- `bounceDetail` — no recent bounce reported.
- `coApplicantMonthlyIncome` — `hasCoApplicant` was No, so this never fires.
- `claimsProductiveUse` / `expectedIncrementalMonthlyCashFlow` — purpose is a wedding, not business/vehicle.

### Income model
Salaried → reliable income = documented income = **₹1,10,000** (INC-01), confidence High.

### Affordability
FOIR ceiling (income > ₹1,00,000 → 50%): ₹55,000 − ₹14,000 existing EMI = ₹41,000.
Household expenses unknown → residual ceiling computed as a **range** (AFF-05: 35%–55% of income): central case assumes 45% (₹49,500), giving residual ceiling = ₹1,10,000 − ₹49,500 − ₹14,000 − 15% buffer (₹16,500) = ₹30,000.
**Safe EMI ceiling = ₹30,000/month** (residual-binding), range **₹19,000–₹41,000** depending on her real expenses.

### O1 — Borrow decision
**Borrow.** No distress flags. At the fair-rate midpoint (11.25%) and Balanced tenure (4 years), her requested ₹8,00,000 needs an EMI of ~₹21,270 — comfortably inside her ₹30,000 ceiling.

### O2 — Amount
- **Safe amount: ₹11,55,308** (range ₹7,31,695–₹15,78,921 depending on her real household expenses) — this is what she should use.
- **Lender-likely amount: ₹15,78,921** — an illustrative, looser income-only estimate; notably higher than safe, which is exactly the gap the brief asks the app to surface.

### O3 — Rate and APR
Fair band **10.0%–12.5%** (strong-salaried base band 10.5–13%, tightened 50bps by her 780 score, RATE-03). Illustrative all-in APR: **13.05%** (includes the effect of monthly compounding on the 11.25% nominal midpoint plus an assumed 2% processing fee).

### O4 — EMI, tenure, stress
Safe EMI ceiling **₹30,000/month**. Recommended tenure: **Balanced, 4 years** (EMI ₹30,000, total interest ₹2,84,692) — Short (3yr) would need ₹37,960/mo, over budget; Long (5yr) would cost ₹75,809 more in total interest for a ₹4,737 lower EMI.
**Stress case:** a 20% income drop lowers her ceiling to ₹24,000/month — her actual EMI at the requested amount would still fit, so the verdict holds under stress.

### Product route
**Personal loan** (unsecured) — no basis for a secured route; purpose is a wedding, not business.

### Confidence
**Medium** — only one material unknown (household expenses).

### Negotiation Card (Priya)
> **Borrow.** Safe amount ₹11,55,308 · Lender may offer ₹15,78,921 · Fair rate 10.0%–12.5% · Illustrative APR 13.05% · Safe EMI ₹30,000/mo · Recommended tenure: Balanced, 4 years · Stress case: holds under a 20% income drop.

---

## Ravi — self-employed, ₹15,00,000 for stock + delivery vehicle

**Profile (from the brief):** 42, Mysuru, kirana store for 14 years, cash income ₹40,000–₹80,000/month, ITR ₹4,20,000/year, owns the shop premises (~₹45,00,000, unencumbered), never taken a formal loan, no credit score, wife earns ₹18,000/month teaching.

### Questions asked
`purpose` → Business — stock/equipment · `amountWanted` → ₹15,00,000 · `productHint` → not sure · `incomeType` → Self-employed · `monthlyIncomeRange` → ₹40,000–₹80,000 · `existingMonthlyEMI` → ₹0 *(explicit — "never taken a formal loan")* · `householdMonthlyExpenses` → **I don't know** *(not given in the brief)* · `ageYears` → 42 · `creditScore` → **No credit history** *(explicit — distinct from "don't know")* · `recentBounce` → No · `incomeTenureYears` → 14 years · `incomeStability` → Highly variable · `annualITRIncome` → ₹4,20,000 · `creditCardUtilisationPct` → I don't know · `emergencySavingsMonths` → I don't know · `upcomingLargeExpense` → I don't know · `collateral` → Property, ₹45,00,000, unencumbered · `hasCoApplicant` → **No** *(not yet confirmed — see sensitivity below)* · `claimsProductiveUse` → Yes · `expectedIncrementalMonthlyCashFlow` → I don't know

### Questions skipped (and why)
- `netMonthlyIncomeSalaried` — not salaried.
- `existingLoanDetail` — existing EMI is explicitly ₹0, so there's no existing loan to describe.
- `bounceDetail` — no bounce reported.
- `coApplicantMonthlyIncome` — **not asked**, because `hasCoApplicant` was answered No. His wife's ₹18,000/month is never counted unless he confirms she is a joint applicant on this specific loan (INC-04) — the app never assumes it just because it's mentioned in his profile.

### Income model
Self-employed → **reliable income = ₹40,000** (low end of range, INC-01). **Lender-likely income anchors to ITR: ₹4,20,000 ÷ 12 = ₹35,000** (INC-03) — lower than his own cash estimate, because that's what a lender can actually verify. This gap is the mechanism behind his safe-vs-lender-likely divergence below.

### Affordability
FOIR ceiling (self-employed, flat 35%): 35% × ₹40,000 − ₹0 = ₹14,000.
Household expenses unknown → residual ceiling computed as a range; central case (45%) gives residual ceiling = ₹40,000 − ₹18,000 − ₹0 − ₹6,000 buffer = ₹16,000.
**Safe EMI ceiling = ₹14,000/month** (FOIR-binding), range **₹12,000–₹14,000**.

### O1 — Borrow decision
**Borrow less.** At the fair-rate midpoint (11.5%) and Balanced tenure (11 years), his ₹15,00,000 ask needs an EMI of ~₹20,075/month — well above his ₹14,000 safe ceiling.

### O2 — Amount
- **Safe amount: ₹10,46,064** — well under his ₹15,00,000 ask.
- **Lender-likely amount: ₹13,07,580** — anchored to his ITR income; also short of ₹15,00,000. Notably, the 50%-LTV cap on his property (₹22,50,000) never binds here — the **income-based ceiling is what's limiting him, not the collateral value**, which is exactly the point: collateral changes the route and the rate, but it does not bypass the affordability check (ROUTE-01/ROUTE-02).

### O3 — Rate and APR
Product routing (below) puts him on **Loan Against Property**, base band 9.5%–12%. His unknown/no credit score widens the band by 75bps (RATE-01) → fair band **10.25%–12.75%**. Illustrative all-in APR: **12.64%**.

### O4 — EMI, tenure, stress
Safe EMI ceiling **₹14,000/month**. Recommended tenure: **Balanced, 11 years** (EMI ₹14,000, total interest ₹8,01,936).
**Stress case:** LAP is a typically-floating product, so both an income drop (20%) and a rate rise (+175bps) are applied. Stressed ceiling falls to ₹11,200/month — his EMI at the requested amount would exceed even the *unstressed* ceiling, so the stress case doesn't change the underlying "borrow less" conclusion, it reinforces it.

### Product route
**Loan Against Property** (ROUTE-01) — because this is a business purpose and he holds unencumbered property, not because collateral makes the loan affordable on its own. Alternatives considered: personal loan, business loan secured.

### Confidence
**Low** — two material unknowns (household expenses, credit score).

### Sensitivity: if Ravi confirms his wife as a co-applicant
This is the exact kind of "change an assumption, watch the app change" scenario named in the brief's follow-up. Toggling `hasCoApplicant` to `true` (his wife's ₹18,000/month, at the documented 60%/80% safe/lender recognition factors, INC-05a/b):

| | Without co-applicant | With co-applicant confirmed |
|---|---|---|
| Safe EMI ceiling | ₹14,000 | ₹17,780 |
| Safe amount | ₹10,46,064 | ₹13,28,501 |
| Lender-likely amount | ₹13,07,580 | ₹18,45,556 |
| Verdict | Borrow less | Borrow less (still short of ₹15,00,000, but materially closer) |

His wife's income moves every downstream number — proof the co-applicant toggle is load-bearing, not decorative — but even fully confirmed, ₹15,00,000 remains a stretch, so the verdict direction doesn't flip. This is a good live-demo moment: it changes the numbers meaningfully without an artificially dramatic flip, which is realistic.

### Negotiation Card (Ravi, without co-applicant)
> **Borrow less.** Safe amount ₹10,46,064 · Lender may offer ₹13,07,580 · Fair rate 10.25%–12.75% · Illustrative APR 12.64% · Safe EMI ₹14,000/mo · Recommended tenure: Balanced, 11 years · Product: Loan against property · Stress case: EMI at requested amount would exceed even the unstressed ceiling.

---

## Anita — informal, ₹1,50,000 for an e-scooter

**Profile (from the brief):** 35, Hubballi, delivery-platform rider + home tailoring, ₹26,000–₹30,000/month, two children, husband unemployed 8 months, three app loans (₹35,000 outstanding at 30%+), one EMI bounced last month.

### Questions asked
`purpose` → Buying a vehicle · `amountWanted` → ₹1,50,000 · `productHint` → not sure · `incomeType` → Informal · `monthlyIncomeRange` → ₹26,000–₹30,000 · `existingMonthlyEMI` → **I don't know** *(the brief gives her outstanding balance and rate, not a monthly EMI figure — not invented)* · `householdMonthlyExpenses` → **I don't know** *(not given)* · `ageYears` → 35 · `creditScore` → **No credit history** · `recentBounce` → Yes · `incomeTenureYears` → I don't know · `incomeStability` → I don't know · `existingLoanDetail` → 3 loans, highest rate ~30% *(asked despite her EMI being unknown — the question no longer requires a known EMI amount to apply)* · `creditCardUtilisationPct` → I don't know · `bounceDetail` → 1 time in the last 12 months, not resolved · `emergencySavingsMonths` → I don't know · `upcomingLargeExpense` → I don't know · `hasCoApplicant` → No *(husband is unemployed and not a candidate co-applicant; not confirmed)* · `claimsProductiveUse` → Yes · `expectedIncrementalMonthlyCashFlow` → I don't know

### Questions skipped (and why)
- `netMonthlyIncomeSalaried`, `annualITRIncome` — not applicable to informal income.
- `collateral` — ticket size (₹1,50,000) is below the collateral-relevance threshold and purpose isn't business.
- `coApplicantMonthlyIncome` — `hasCoApplicant` was No, so this never fires.

### Income model
Informal → reliable income = documented/lender-facing income = **₹26,000** (low end of range, INC-02).

### Affordability
FOIR ceiling (informal, flat 30%): 30% × ₹26,000 = ₹7,800, minus an **unknown existing EMI**, modelled as a range (AFF-04: 5%–20% of income) rather than assumed zero. Household expenses also unknown (AFF-05).
**Safe EMI ceiling = ₹5,200/month** (central case), genuine range **₹2,600–₹6,500** — never a single invented number, and her actual EMI and expenses stay `'unknown'` throughout.

### O1 — Borrow decision
**Don't borrow right now.** This fires from **VER-02**: an unresolved recent bounce combined with 3 active loans at ≈30% APR — a materially more urgent combination than either signal alone, not a punitive reaction to one isolated flag (VER-05 explicitly prevents that overreaction).

### O2 — Amount
Even though a verdict of "Don't borrow" is the headline, the app still computes and shows the underlying numbers so she can see exactly what's driving the caution:
- Safe amount: ₹1,88,556 (range ₹94,278–₹2,35,696)
- Lender-likely amount: ₹3,77,113

Both are technically above her ₹1,50,000 ask — which is precisely *why* the verdict has to come from the distress-flag logic (VER-02) rather than the amount-gap logic (VER-03): a pure affordability read would have said "Borrow," but the active repayment-distress signal correctly overrides it.

### O3 — Rate and APR
Routed to two-wheeler hypothecation, base band 10%–14%. Her unknown/no credit score widens it by 75bps and her unresolved bounce shifts it further (+150/+200bps, RATE-02) → fair band **12.25%–16.75%**. Illustrative all-in APR: **16.78%** — useful context if she proceeds anyway or shops around later, to recognise a predatory quote (anything meaningfully above this band).

### O4 — EMI, tenure, stress
Safe EMI ceiling **₹5,200/month** (central case). Recommended tenure: Balanced, 4 years (EMI ₹5,200). Stress case: a further 20% income drop would still fit within a reduced ceiling of ₹4,160 — the underlying affordability math has headroom; it's the distress flags, not the raw numbers, driving the "don't borrow" call.

### Product route
**Two-wheeler hypothecation** — shown as the product she *would* be routed to if she proceeds, independent of the verdict. Product routing and the borrow/don't-borrow decision are deliberately separate concerns in this engine.

### Confidence
**Low** — four material unknowns (existing EMI, household expenses, income stability, credit score).

### What would need to change
The app surfaces this explicitly rather than leaving a dead end: resolve the current arrears, reduce or consolidate the ₹35,000 in high-cost app-loan debt, build some repayment buffer, then revisit vehicle financing. The scooter's productive-use claim (doubling delivery runs) doesn't change the verdict — the active distress signal is the blocking issue, not a lack of income potential.

### Negotiation Card (Anita)
> **Don't borrow right now.** Reason: an unresolved recent bounce alongside existing high-cost/multiple active debt is not currently borrower-safe. If proceeding later: fair rate 12.25%–16.75%, illustrative APR 16.78%, product: two-wheeler hypothecation. Address current arrears and high-cost debt first.

---

## Cross-persona summary

| | Priya | Ravi | Anita |
|---|---|---|---|
| Verdict | Borrow | Borrow less | Don't borrow right now |
| Product | Personal loan | **Loan against property (secured)** | Two-wheeler (if she proceeds) |
| Safe amount | ₹11,55,308 | ₹10,46,064 | ₹1,88,556 |
| Lender-likely amount | ₹15,78,921 | ₹13,07,580 | ₹3,77,113 |
| Fair rate band | 10.0–12.5% | 10.25–12.75% | 12.25–16.75% |
| Illustrative APR | 13.05% | 12.64% | 16.78% |
| Confidence | Medium | Low | Low |
| Verdict driver | Comfortable affordability, no flags | Amount exceeds affordability (VER-03) | Active repayment distress (VER-02), independent of raw affordability |

Every figure above is reproducible by running `npm test` (see `src/tests/personas.golden.test.ts` and `src/tests/questionFlow.test.ts`) or by opening the app and answering exactly as listed in each "Questions asked" section.
