import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IpipAnswerValue } from '../ipip/answerScale';
import { IPIP_QUESTIONS, IPIP_QUESTION_COUNT } from '../ipip/ipipQuestions';
import type { IpipScoreResults } from '../ipip/scoring';
import { computeIpipScores } from '../ipip/scoring';
import {
  clearIpipProgress,
  loadIpipProgress,
  loadIpipResults,
  saveIpipProgress,
  scoreAndPersistIpip,
} from '../ipip/storage';

export type IpipQuestionnairePhase = 'loading' | 'intro' | 'questions' | 'results';

export function useIpipQuestionnaire() {
  const [phase, setPhase] = useState<IpipQuestionnairePhase>('loading');
  const [answers, setAnswers] = useState<Record<number, IpipAnswerValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<IpipScoreResults | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [progress, savedResults] = await Promise.all([loadIpipProgress(), loadIpipResults()]);
      if (cancelled) return;

      setAnswers(progress.answers);
      setCurrentIndex(progress.currentIndex);
      setResults(savedResults);

      if (progress.isComplete && savedResults) {
        setPhase('results');
      } else if (progress.answeredCount > 0) {
        setPhase('intro');
      } else {
        setPhase('intro');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentQuestion = IPIP_QUESTIONS[currentIndex] ?? null;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progressPct = answeredCount / IPIP_QUESTION_COUNT;

  const persist = useCallback(async (nextAnswers: Record<number, IpipAnswerValue>, nextIndex: number) => {
    await saveIpipProgress(nextAnswers, nextIndex);
    if (Object.keys(nextAnswers).length >= IPIP_QUESTION_COUNT) {
      const scored = await scoreAndPersistIpip(nextAnswers);
      setResults(scored);
    } else {
      setResults(computeIpipScores(nextAnswers));
    }
  }, []);

  const startQuestionnaire = useCallback(() => {
    setPhase('questions');
  }, []);

  const resumeQuestionnaire = useCallback(() => {
    const firstUnanswered = IPIP_QUESTIONS.findIndex((q) => answers[q.id] == null);
    setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : Math.min(currentIndex, IPIP_QUESTION_COUNT - 1));
    setPhase('questions');
  }, [answers, currentIndex]);

  const answerCurrent = useCallback(
    async (value: IpipAnswerValue) => {
      if (!currentQuestion) return;
      const nextAnswers = { ...answers, [currentQuestion.id]: value };
      const isLast = currentIndex >= IPIP_QUESTION_COUNT - 1;
      const nextIndex = isLast ? currentIndex : currentIndex + 1;

      setAnswers(nextAnswers);
      setCurrentIndex(nextIndex);
      await persist(nextAnswers, nextIndex);

      if (isLast) {
        const scored = await scoreAndPersistIpip(nextAnswers);
        setResults(scored);
        setPhase('results');
      }
    },
    [answers, currentIndex, currentQuestion, persist],
  );

  const goBack = useCallback(() => {
    setCurrentIndex((idx) => {
      const next = Math.max(0, idx - 1);
      void saveIpipProgress(answers, next);
      return next;
    });
  }, [answers]);

  const restart = useCallback(async () => {
    await clearIpipProgress();
    setAnswers({});
    setCurrentIndex(0);
    setResults(null);
    setPhase('intro');
  }, []);

  const viewResults = useCallback(() => {
    if (results?.isComplete) {
      setPhase('results');
    }
  }, [results]);

  return {
    phase,
    answers,
    currentIndex,
    currentQuestion,
    answeredCount,
    progressPct,
    results,
    startQuestionnaire,
    resumeQuestionnaire,
    answerCurrent,
    goBack,
    restart,
    viewResults,
  };
}
