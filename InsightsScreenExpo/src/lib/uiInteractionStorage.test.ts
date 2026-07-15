/**
 * UI interaction storage tests.
 * Run: npm run test:ui-interactions
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterUiInteractionsForExport,
  type UiInteractionEvent,
} from './uiInteractionStorage';

describe('filterUiInteractionsForExport', () => {
  const events: UiInteractionEvent[] = [
    {
      id: 'a',
      at: '2026-06-01T12:00:00.000Z',
      screen: 'Dashboard',
      gesture: 'tap',
      target: 'nav.Dashboard',
      direction: '',
    },
    {
      id: 'b',
      at: '2026-05-01T12:00:00.000Z',
      screen: 'Insights',
      gesture: 'swipe',
      target: 'swipes.card.n1',
      direction: 'left',
    },
  ];

  it('keeps events inside the export date range', () => {
    const filtered = filterUiInteractionsForExport(events, {
      start: '2026-06-01T00:00:00.000Z',
      end: '2026-06-02T00:00:00.000Z',
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, 'a');
  });
});
