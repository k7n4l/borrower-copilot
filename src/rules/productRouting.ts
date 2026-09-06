import type { Answers, ProductRoutingOutput, ProductType } from './types';
import { isUnknown } from './types';
import { ROUTING_RULES } from './constants';

const BUSINESS_PURPOSES: Answers['purpose'][] = ['business_stock_or_equipment', 'business_expansion'];

/**
 * ROUTE-01/ROUTE-02/ROUTE-03: decides which product type the borrower
 * should be evaluated against. This is a routing SUGGESTION based on
 * purpose + available collateral — not a claim that any specific lender
 * will offer this product or these terms.
 *
 * Precedence:
 *  1. If the borrower named a specific product AND it's coherent with
 *     purpose/collateral, respect it (borrower may know their situation
 *     better than a purpose-code heuristic).
 *  2. Business/productive purpose + sizeable unencumbered collateral →
 *     secured business loan / LAP (ROUTE-01). This is the Ravi case.
 *  3. Vehicle purpose with a modest ticket size → two-wheeler
 *     hypothecation (ROUTE-03).
 *  4. Otherwise → unsecured personal loan, the default.
 */
export function routeProduct(a: Answers): ProductRoutingOutput {
  const alternatives: ProductType[] = [];

  // Resolve collateral into a concrete, narrowed value once, rather than
  // re-checking isUnknown()/undefined at every use site with a non-null
  // assertion — this is what lets TypeScript actually narrow the type.
  const resolvedCollateral = !isUnknown(a.collateral) && a.collateral !== undefined ? a.collateral : undefined;
  const hasCollateral = resolvedCollateral !== undefined && !resolvedCollateral.encumbered && resolvedCollateral.estimatedValue > 0;

  const isBusinessPurpose = BUSINESS_PURPOSES.includes(a.purpose);

  // Explicit borrower-stated product hint, if coherent, is respected.
  if (!isUnknown(a.productHint) && a.productHint !== undefined && a.productHint !== 'unspecified') {
    alternatives.push('personal_loan');
    return {
      value: a.productHint,
      confidence: 'Medium',
      explanation: 'We used the loan type you told us you were considering.',
      ruleRefs: ['ROUTE-01'],
      assumptionsUsed: [],
      alternativesConsidered: alternatives,
    };
  }

  if (isBusinessPurpose && hasCollateral && resolvedCollateral?.type === 'property') {
    alternatives.push('personal_loan', 'business_loan_secured');
    return {
      value: 'loan_against_property',
      confidence: 'Medium',
      explanation:
        'Because this is for your business and you have unencumbered property, a secured loan against that property is likely to get you a materially better rate and higher eligible amount than an unsecured personal loan for the same repayment capacity.',
      ruleRefs: ['ROUTE-01', 'ROUTE-02'],
      assumptionsUsed: [],
      alternativesConsidered: alternatives,
    };
  }

  if (isBusinessPurpose && !hasCollateral) {
    alternatives.push('personal_loan');
    return {
      value: 'business_loan_secured',
      confidence: 'Low',
      explanation:
        'This looks like a business purpose, but without collateral to secure it we can only evaluate it as a higher-cost unsecured route unless you have other security to offer.',
      ruleRefs: ['ROUTE-01'],
      assumptionsUsed: ['No collateral confirmed; business loan shown as aspirational, personal loan as the realistic fallback.'],
      alternativesConsidered: alternatives,
    };
  }

  if (a.purpose === 'vehicle' && a.amountWanted <= ROUTING_RULES.VEHICLE_PURPOSE_ROUTES_TWO_WHEELER_MAX_TICKET) {
    alternatives.push('personal_loan');
    return {
      value: 'two_wheeler_loan',
      confidence: 'Medium',
      explanation:
        'A vehicle-hypothecated loan is usually cheaper than an unsecured personal loan for a purchase this size, since the vehicle itself backs the loan.',
      ruleRefs: ['ROUTE-03'],
      assumptionsUsed: [],
      alternativesConsidered: alternatives,
    };
  }

  return {
    value: 'personal_loan',
    confidence: 'Medium',
    explanation: 'Based on what you told us, an unsecured personal loan is the most relevant product to evaluate.',
    ruleRefs: ['ROUTE-01'],
    assumptionsUsed: [],
    alternativesConsidered: alternatives,
  };
}
