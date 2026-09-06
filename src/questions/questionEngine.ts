import type { QuestionDef } from './schema';
import { CORE_QUESTIONS } from './coreQuestions';
import { ADAPTIVE_QUESTIONS } from './adaptiveQuestions';
import type { Answers } from '../rules/types';

export const ALL_QUESTIONS: QuestionDef[] = [...CORE_QUESTIONS, ...ADAPTIVE_QUESTIONS];

/**
 * Returns the questions that currently apply given the draft answers so
 * far (core questions always apply; adaptive questions apply based on
 * their appliesWhen predicate). This is what makes the flow adaptive: a
 * salaried IT employee and a kirana owner naturally see different lists
 * without any per-persona branching in the UI.
 */
export function getVisibleQuestions(draft: Partial<Answers>): QuestionDef[] {
  return ALL_QUESTIONS.filter((q) => q.appliesWhen(draft));
}

export function getNextQuestion(draft: Partial<Answers>, answeredIds: Set<string>): QuestionDef | null {
  const visible = getVisibleQuestions(draft);
  return visible.find((q) => !answeredIds.has(q.id)) ?? null;
}

export interface Progress {
  coreAnswered: number;
  coreTotal: number;
  adaptiveAnswered: number;
  adaptiveRelevant: number;
}

export function getProgress(draft: Partial<Answers>, answeredIds: Set<string>): Progress {
  const visible = getVisibleQuestions(draft);
  const visibleCore = visible.filter((q) => q.tier === 'core');
  const visibleAdaptive = visible.filter((q) => q.tier === 'adaptive');
  return {
    coreAnswered: visibleCore.filter((q) => answeredIds.has(q.id)).length,
    coreTotal: visibleCore.length,
    adaptiveAnswered: visibleAdaptive.filter((q) => answeredIds.has(q.id)).length,
    adaptiveRelevant: visibleAdaptive.length,
  };
}

/** Returns true once every currently-relevant CORE question has been answered — enough to compute a first result. */
export function coreComplete(draft: Partial<Answers>, answeredIds: Set<string>): boolean {
  const p = getProgress(draft, answeredIds);
  return p.coreAnswered === p.coreTotal && p.coreTotal > 0;
}

export interface QuestionLogEntry {
  id: string;
  prompt: string;
  status: 'asked' | 'skipped';
  reasonSkipped?: string;
}

/**
 * Builds the full audit log of what was asked vs. skipped and why, for a
 * given final draft — this is exactly what RUNTHROUGHS.md needs, and
 * it's derived mechanically rather than hand-written, so it can never
 * drift from what the app actually did.
 */
export function buildQuestionLog(draft: Answers, answeredIds: Set<string>): QuestionLogEntry[] {
  return ALL_QUESTIONS.map((q) => {
    if (q.appliesWhen(draft) && answeredIds.has(q.id)) {
      return { id: q.id, prompt: q.prompt, status: 'asked' as const };
    }
    const reason = q.skipReason?.(draft) ?? (q.tier === 'core' ? null : 'Not applicable to this profile.');
    return { id: q.id, prompt: q.prompt, status: 'skipped' as const, reasonSkipped: reason ?? 'Not applicable.' };
  });
}
