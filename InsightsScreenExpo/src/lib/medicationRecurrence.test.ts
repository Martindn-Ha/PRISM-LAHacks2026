/**
 * Medication recurrence tests.
 * Run: npx tsx --test src/lib/medicationRecurrence.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { expandMedicationRecurrenceDayKeys } from './medicationRecurrence';

describe('expandMedicationRecurrenceDayKeys', () => {
  it('returns only start day for once', () => {
    const keys = expandMedicationRecurrenceDayKeys({
      startDayKey: '2026-06-10',
      endDayKey: '2026-06-20',
      recurrence: 'once',
    });
    assert.deepEqual(keys, ['2026-06-10']);
  });

  it('expands daily inclusive range', () => {
    const keys = expandMedicationRecurrenceDayKeys({
      startDayKey: '2026-06-10',
      endDayKey: '2026-06-12',
      recurrence: 'daily',
    });
    assert.deepEqual(keys, ['2026-06-10', '2026-06-11', '2026-06-12']);
  });

  it('expands weekly for selected weekdays', () => {
    // 2026-06-10 is Wednesday (3)
    const keys = expandMedicationRecurrenceDayKeys({
      startDayKey: '2026-06-10',
      endDayKey: '2026-06-17',
      recurrence: 'weekly',
      weekdays: [3, 5],
    });
    assert.deepEqual(keys, ['2026-06-10', '2026-06-12', '2026-06-17']);
  });
});
