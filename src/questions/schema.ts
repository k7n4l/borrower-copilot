import type { Answers } from '../rules/types';

export type ControlType =
  | 'single_select'
  | 'currency_number'
  | 'currency_range'
  | 'yes_no_unknown'
  | 'boolean'
  | 'number'
  | 'credit_score_or_unknown';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A single question in the flow. `applyAnswer` is a pure function that
 * takes the current answer draft and the raw UI response and returns a
 * NEW draft — this is the only place a raw UI value is translated into
 * the typed Answers shape, which is what makes it possible to guarantee
 * "unknown" never silently becomes 0/false: every applyAnswer for a
 * field that supports "don't know" has an explicit branch that sets the
 * literal string 'unknown', never a numeric or boolean default.
 */
export interface QuestionDef {
  id: string;
  tier: 'core' | 'adaptive';
  section: string;
  prompt: string;
  helpText?: string;
  /** Shown in the "Why are we asking this?" affordance and in RUNTHROUGHS.md. */
  reason: string;
  /** Rule IDs / outputs this question can move. Every adaptive question must list at least one. */
  affects: string[];
  controlType: ControlType;
  options?: SelectOption[];
  /** Core questions are always relevant; adaptive questions declare when they apply. */
  appliesWhen: (draft: Partial<Answers>) => boolean;
  /** Human-readable reason this question is being skipped for the current draft, for the run-through log. */
  skipReason?: (draft: Partial<Answers>) => string | null;
  applyAnswer: (draft: Answers, raw: unknown) => Answers;
  allowUnknown: boolean;
}
