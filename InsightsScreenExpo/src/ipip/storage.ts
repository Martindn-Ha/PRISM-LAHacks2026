import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IpipAnswerValue } from './answerScale';
import { isIpipAnswerValue } from './answerScale';
import { IPIP_QUESTION_COUNT } from './ipipQuestions';
import type { IpipScoreResults } from './scoring';
import { computeIpipScores } from './scoring';

const ANSWERS_KEY = 'prism:ipip:answers';
const INDEX_KEY = 'prism:ipip:currentIndex';
const RESULTS_KEY = 'prism:ipip:results';

export type IpipProgress = {
  answers: Record<number, IpipAnswerValue>;
  currentIndex: number;
  answeredCount: number;
  isComplete: boolean;
};

function sanitizeAnswers(raw: unknown): Record<number, IpipAnswerValue> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<number, IpipAnswerValue> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    const id = Number(key);
    if (Number.isFinite(id) && isIpipAnswerValue(value)) {
      out[id] = value;
    }
  });
  return out;
}

export async function loadIpipProgress(): Promise<IpipProgress> {
  try {
    const [answersRaw, indexRaw] = await Promise.all([AsyncStorage.getItem(ANSWERS_KEY), AsyncStorage.getItem(INDEX_KEY)]);
    const answers = sanitizeAnswers(answersRaw ? JSON.parse(answersRaw) : {});
    const answeredCount = Object.keys(answers).length;
    let currentIndex = Number(indexRaw ?? 0);
    if (!Number.isFinite(currentIndex)) currentIndex = 0;
    currentIndex = Math.max(0, Math.min(IPIP_QUESTION_COUNT - 1, Math.floor(currentIndex)));
    return {
      answers,
      currentIndex,
      answeredCount,
      isComplete: answeredCount >= IPIP_QUESTION_COUNT,
    };
  } catch {
    return { answers: {}, currentIndex: 0, answeredCount: 0, isComplete: false };
  }
}

export async function saveIpipProgress(answers: Record<number, IpipAnswerValue>, currentIndex: number): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(ANSWERS_KEY, JSON.stringify(answers)),
      AsyncStorage.setItem(INDEX_KEY, String(Math.max(0, Math.min(IPIP_QUESTION_COUNT - 1, currentIndex)))),
    ]);
  } catch {
    // Ignore persistence failures for this session.
  }
}

export async function loadIpipResults(): Promise<IpipScoreResults | null> {
  try {
    const raw = await AsyncStorage.getItem(RESULTS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as IpipScoreResults;
  } catch {
    return null;
  }
}

export async function saveIpipResults(results: IpipScoreResults): Promise<void> {
  try {
    await AsyncStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch {
    // Ignore persistence failures.
  }
}

export async function clearIpipProgress(): Promise<void> {
  try {
    await Promise.all([AsyncStorage.removeItem(ANSWERS_KEY), AsyncStorage.removeItem(INDEX_KEY), AsyncStorage.removeItem(RESULTS_KEY)]);
  } catch {
    // Ignore.
  }
}

export async function scoreAndPersistIpip(answers: Record<number, IpipAnswerValue>): Promise<IpipScoreResults> {
  const results = computeIpipScores(answers);
  if (results.isComplete) {
    await saveIpipResults(results);
  }
  return results;
}
