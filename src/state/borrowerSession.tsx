import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type { Answers, DecisionModel } from '../rules/types';
import { computeOutputs } from '../rules/engine';
import { DEFAULT_DRAFT } from '../questions/defaultDraft';
import { getNextQuestion, getProgress, coreComplete } from '../questions/questionEngine';
import type { Progress } from '../questions/questionEngine';
import type { QuestionDef } from '../questions/schema';

interface SessionState {
  draft: Answers;
  answeredIds: Set<string>;
}

type Action = { type: 'ANSWER'; question: QuestionDef; raw: unknown } | { type: 'RESET' };

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'ANSWER': {
      const newDraft = action.question.applyAnswer(state.draft, action.raw);
      const newAnswered = new Set(state.answeredIds);
      newAnswered.add(action.question.id);
      return { draft: newDraft, answeredIds: newAnswered };
    }
    case 'RESET':
      return { draft: DEFAULT_DRAFT, answeredIds: new Set() };
    default:
      return state;
  }
}

interface SessionContextValue {
  draft: Answers;
  answeredIds: Set<string>;
  nextQuestion: QuestionDef | null;
  progress: Progress;
  isCoreComplete: boolean;
  /** Only populated once core questions are complete — this is the ONLY place outputs are computed. */
  outputs: DecisionModel | null;
  answer: (question: QuestionDef, raw: unknown) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function BorrowerSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { draft: DEFAULT_DRAFT, answeredIds: new Set<string>() });

  const nextQuestion = getNextQuestion(state.draft, state.answeredIds);
  const progress = getProgress(state.draft, state.answeredIds);
  const isCoreComplete = coreComplete(state.draft, state.answeredIds);

  // computeOutputs is a pure function of `draft`; recomputing on every
  // render of a changed draft is intentional and cheap (no network, no
  // ML) — this is exactly what makes "change an assumption, watch the
  // app change live" work: nothing is cached or precomputed elsewhere.
  const outputs = useMemo(() => (isCoreComplete ? computeOutputs(state.draft) : null), [state.draft, isCoreComplete]);

  const value: SessionContextValue = {
    draft: state.draft,
    answeredIds: state.answeredIds,
    nextQuestion,
    progress,
    isCoreComplete,
    outputs,
    answer: (question, raw) => dispatch({ type: 'ANSWER', question, raw }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useBorrowerSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useBorrowerSession must be used within a BorrowerSessionProvider');
  return ctx;
}
