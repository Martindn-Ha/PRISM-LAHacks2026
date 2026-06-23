export const IPIP_QUESTIONNAIRE_TITLE = 'IPIP-NEO-120';

export const IPIP_QUESTIONNAIRE_INTRO_LINES = [
  'The International Personality Item Pool (IPIP) is a public-domain collection of personality items used in research.',
  'NEO refers to Neuroticism, Extraversion, and Openness — three core domains in the Five-Factor personality model.',
  'IPIP-NEO-120 is a 120-item self-report personality inventory for use by older adolescents and adults (ages 16+).',
] as const;

export const IPIP_INTRO_INSTRUCTIONS =
  'Describe yourself honestly and as you are now, not as you wish to be in the future.';
export type IpipAnswerValue = 1 | 2 | 3 | 4 | 5;

export const IPIP_ANSWER_SCALE = [
  { value: 1 as const, label: 'Very unlike me' },
  { value: 2 as const, label: 'Somewhat unlike me' },
  { value: 3 as const, label: 'Not sure' },
  { value: 4 as const, label: 'Somewhat like me' },
  { value: 5 as const, label: 'Very like me' },
] as const;

export function isIpipAnswerValue(value: unknown): value is IpipAnswerValue {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}
