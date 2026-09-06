/**
 * Standard reducing-balance EMI formula.
 * @param principal ₹
 * @param annualRatePct e.g. 0.12 for 12%
 * @param years loan tenure in years
 */
export function calculateEMI(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRatePct / 12; // monthly rate
  const n = Math.round(years * 12);
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

/**
 * Solve for the maximum principal such that EMI(principal, rate, years) <= maxEmi.
 * Closed-form inverse of calculateEMI.
 */
export function maxPrincipalForEmi(maxEmi: number, annualRatePct: number, years: number): number {
  if (maxEmi <= 0 || years <= 0) return 0;
  const r = annualRatePct / 12;
  const n = Math.round(years * 12);
  if (r === 0) return maxEmi * n;
  const factor = Math.pow(1 + r, n);
  return (maxEmi * (factor - 1)) / (r * factor);
}

export function totalInterest(principal: number, annualRatePct: number, years: number): number {
  const emi = calculateEMI(principal, annualRatePct, years);
  return emi * Math.round(years * 12) - principal;
}

/**
 * Compute the effective annualised cost (APR-like) of a loan using the
 * actual borrower cash flows: they receive (principal - upfront fee) at
 * disbursement, then pay `emi` every month for n months. We find the
 * monthly rate that discounts those cash flows to zero (IRR), then
 * annualise it. This is a materially more honest approximation of
 * all-in cost than "nominal + fee/tenure" because it correctly reflects
 * that the fee is paid on day one against the full principal, not spread
 * evenly like the nominal-rate approximation implies.
 *
 * Implemented via bisection (simple, deterministic, no external deps).
 */
export function effectiveAnnualCostFromCashFlows(
  principal: number,
  processingFeePct: number,
  annualNominalRatePct: number,
  years: number
): number {
  const emi = calculateEMI(principal, annualNominalRatePct, years);
  const n = Math.round(years * 12);
  const netDisbursement = principal * (1 - processingFeePct);

  // NPV(monthlyRate) = netDisbursement - sum_{t=1..n} emi / (1+monthlyRate)^t
  // We solve NPV(r) = 0 for r via bisection, then annualise: (1+r)^12 - 1.
  const npv = (monthlyRate: number): number => {
    if (monthlyRate <= -0.999) return Infinity;
    let pvOfPayments = 0;
    for (let t = 1; t <= n; t++) {
      pvOfPayments += emi / Math.pow(1 + monthlyRate, t);
    }
    return netDisbursement - pvOfPayments;
  };

  let lo = 0.0; // 0% monthly is a valid lower bound (fee-only cost is always >= nominal)
  let hi = 1.0; // 100% monthly ceiling, generous enough for any realistic consumer loan
  // Ensure sign change; if not, fall back to nominal rate as a safe approximation.
  if (npv(lo) * npv(hi) > 0) {
    return annualNominalRatePct + processingFeePct / years;
  }
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const val = npv(mid);
    if (Math.abs(val) < 0.01) {
      return Math.pow(1 + mid, 12) - 1;
    }
    if (npv(lo) * val <= 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  const finalRate = (lo + hi) / 2;
  return Math.pow(1 + finalRate, 12) - 1;
}
