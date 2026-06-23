/**
 * IPIP-NEO-120 raw scoring tests.
 * Run: node --experimental-strip-types --test src/ipip/scoring.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IpipAnswerValue } from './answerScale';
import { IPIP_MINUS_KEYED_COUNT, IPIP_MINUS_KEYED_ITEM_IDS } from './itemKeying';
import { IPIP_QUESTIONS, IPIP_QUESTION_COUNT } from './ipipQuestions';
import {
  IPIP_DOMAIN_RAW_MAX,
  IPIP_DOMAIN_RAW_MIN,
  IPIP_FACET_RAW_MAX,
  IPIP_FACET_RAW_MIN,
  computeIpipScores,
  scoreItemAnswer,
} from './scoring';

describe('IPIP item keying', () => {
  it('has 120 questions with 4 items per facet', () => {
    assert.equal(IPIP_QUESTIONS.length, IPIP_QUESTION_COUNT);
    const facetCounts = new Map<string, number>();
    for (const q of IPIP_QUESTIONS) {
      const key = `${q.domain}${q.facet}`;
      facetCounts.set(key, (facetCounts.get(key) ?? 0) + 1);
    }
    assert.equal(facetCounts.size, 30);
    for (const count of facetCounts.values()) {
      assert.equal(count, 4);
    }
  });

  it('has 55 minus-keyed items aligned with ipipQuestions.reversed', () => {
    assert.equal(IPIP_MINUS_KEYED_COUNT, 55);
    for (const q of IPIP_QUESTIONS) {
      assert.equal(q.reversed, IPIP_MINUS_KEYED_ITEM_IDS.has(q.id), `item ${q.id}`);
    }
  });
});

describe('scoreItemAnswer', () => {
  it('passes through plus-keyed answers', () => {
    assert.equal(scoreItemAnswer(3, false), 3);
  });

  it('reverse-scores minus-keyed answers with 6 - answer', () => {
    assert.equal(scoreItemAnswer(1, true), 5);
    assert.equal(scoreItemAnswer(5, true), 1);
  });
});

describe('computeIpipScores', () => {
  it('scores all-1 answers per facet from keying mix', () => {
    const answers = Object.fromEntries(IPIP_QUESTIONS.map((q) => [q.id, 1 as IpipAnswerValue]));
    const results = computeIpipScores(answers);
    assert.equal(results.isComplete, true);

    for (const domain of results.domains) {
      for (const facet of domain.facets) {
        const questions = IPIP_QUESTIONS.filter((q) => q.domain === facet.domain && q.facet === facet.facet);
        const minus = questions.filter((q) => q.reversed).length;
        const plus = questions.length - minus;
        const expected = plus * 1 + minus * 5;
        assert.equal(facet.rawTotal, expected, `${facet.key} all-1`);
        assert.equal(facet.itemCount, 4);
        assert.equal(facet.percentile, null);
        assert.equal(facet.levelLabel, null);
        assert.equal(facet.interpretation, null);
      }

      const expectedDomain = domain.facets.reduce((sum, f) => sum + f.rawTotal, 0);
      assert.equal(domain.rawTotal, expectedDomain);
      assert.equal(domain.itemCount, 24);
      assert.equal(domain.percentile, null);
      assert.equal(domain.levelLabel, null);
      assert.equal(domain.interpretation, null);
    }
  });

  it('scores all-5 answers per facet from keying mix', () => {
    const answers = Object.fromEntries(IPIP_QUESTIONS.map((q) => [q.id, 5 as IpipAnswerValue]));
    const results = computeIpipScores(answers);

    for (const domain of results.domains) {
      for (const facet of domain.facets) {
        const questions = IPIP_QUESTIONS.filter((q) => q.domain === facet.domain && q.facet === facet.facet);
        const minus = questions.filter((q) => q.reversed).length;
        const plus = questions.length - minus;
        const expected = plus * 5 + minus * 1;
        assert.equal(facet.rawTotal, expected, `${facet.key} all-5`);
      }
    }
  });

  it('uses official raw score ranges when complete', () => {
    const answers = Object.fromEntries(IPIP_QUESTIONS.map((q) => [q.id, 3 as IpipAnswerValue]));
    const results = computeIpipScores(answers);

    for (const domain of results.domains) {
      for (const facet of domain.facets) {
        assert.ok(facet.rawTotal >= IPIP_FACET_RAW_MIN && facet.rawTotal <= IPIP_FACET_RAW_MAX);
      }
      assert.ok(domain.rawTotal >= IPIP_DOMAIN_RAW_MIN && domain.rawTotal <= IPIP_DOMAIN_RAW_MAX);
    }
  });
});
