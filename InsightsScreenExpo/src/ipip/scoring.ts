import type { IpipAnswerValue } from './answerScale';
import { IPIP_QUESTIONS, type IpipDomainCode } from './ipipQuestions';

export type IpipFacetScore = {
  domain: IpipDomainCode;
  facet: number;
  key: string;
  label: string;
  rawTotal: number;
  itemCount: number;
  /** Placeholder for future norm-based percentile. */
  percentile: null;
  /** Placeholder for future Low / Average / High label. */
  levelLabel: null;
  /** Placeholder for future written interpretation. */
  interpretation: null;
};

export type IpipDomainScore = {
  domain: IpipDomainCode;
  label: string;
  rawTotal: number;
  itemCount: number;
  facets: IpipFacetScore[];
  /** Placeholder for future norm-based percentile. */
  percentile: null;
  /** Placeholder for future Low / Average / High label. */
  levelLabel: null;
  /** Placeholder for future written interpretation. */
  interpretation: null;
};

export type IpipScoreResults = {
  answeredCount: number;
  isComplete: boolean;
  domains: IpipDomainScore[];
  computedAt: string;
};

/** Official IPIP-NEO-120 / NEO-PI-R domain names (Johnson, 2014). */
export const IPIP_DOMAIN_LABELS: Record<IpipDomainCode, string> = {
  N: 'Neuroticism',
  E: 'Extraversion',
  O: 'Openness to Experience',
  A: 'Agreeableness',
  C: 'Conscientiousness',
};

/** Official IPIP-NEO-120 facet names (Johnson, 2014). */
export const IPIP_FACET_LABELS: Record<IpipDomainCode, Record<number, string>> = {
  N: {
    1: 'Anxiety',
    2: 'Anger',
    3: 'Depression',
    4: 'Self-Consciousness',
    5: 'Immoderation',
    6: 'Vulnerability',
  },
  E: {
    1: 'Friendliness',
    2: 'Gregariousness',
    3: 'Assertiveness',
    4: 'Activity Level',
    5: 'Excitement-Seeking',
    6: 'Cheerfulness',
  },
  O: {
    1: 'Imagination',
    2: 'Artistic Interests',
    3: 'Emotionality',
    4: 'Adventurousness',
    5: 'Intellect',
    6: 'Liberalism',
  },
  A: {
    1: 'Trust',
    2: 'Morality',
    3: 'Altruism',
    4: 'Cooperation',
    5: 'Modesty',
    6: 'Sympathy',
  },
  C: {
    1: 'Self-Efficacy',
    2: 'Orderliness',
    3: 'Dutifulness',
    4: 'Achievement-Striving',
    5: 'Self-Discipline',
    6: 'Cautiousness',
  },
};

export const IPIP_FACET_RAW_MIN = 4;
export const IPIP_FACET_RAW_MAX = 20;
export const IPIP_DOMAIN_RAW_MIN = 24;
export const IPIP_DOMAIN_RAW_MAX = 120;

/** Reverse-score items marked minus-keyed: high agreement lowers the trait score. */
export function scoreItemAnswer(answer: IpipAnswerValue, reversed: boolean): number {
  return reversed ? 6 - answer : answer;
}

export function computeIpipScores(answers: Record<number, IpipAnswerValue>): IpipScoreResults {
  const facetBuckets = new Map<string, { domain: IpipDomainCode; facet: number; total: number; count: number }>();

  IPIP_QUESTIONS.forEach((question) => {
    const answer = answers[question.id];
    if (answer == null) return;
    const key = `${question.domain}-${question.facet}`;
    const bucket = facetBuckets.get(key) ?? { domain: question.domain, facet: question.facet, total: 0, count: 0 };
    bucket.total += scoreItemAnswer(answer, question.reversed);
    bucket.count += 1;
    facetBuckets.set(key, bucket);
  });

  const facets: IpipFacetScore[] = [...facetBuckets.values()]
    .map((bucket) => ({
      domain: bucket.domain,
      facet: bucket.facet,
      key: `${bucket.domain}-${bucket.facet}`,
      label: IPIP_FACET_LABELS[bucket.domain][bucket.facet] ?? `Facet ${bucket.facet}`,
      rawTotal: bucket.total,
      itemCount: bucket.count,
      percentile: null,
      levelLabel: null,
      interpretation: null,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.facet - b.facet);

  const domains = (['N', 'E', 'O', 'A', 'C'] as IpipDomainCode[]).map((domain) => {
    const domainFacets = facets.filter((f) => f.domain === domain);
    const rawTotal = domainFacets.reduce((sum, f) => sum + f.rawTotal, 0);
    const itemCount = domainFacets.reduce((sum, f) => sum + f.itemCount, 0);
    return {
      domain,
      label: IPIP_DOMAIN_LABELS[domain],
      rawTotal,
      itemCount,
      facets: domainFacets,
      percentile: null,
      levelLabel: null,
      interpretation: null,
    };
  });

  const answeredCount = Object.keys(answers).length;

  return {
    answeredCount,
    isComplete: answeredCount >= IPIP_QUESTIONS.length,
    domains,
    computedAt: new Date().toISOString(),
  };
}
