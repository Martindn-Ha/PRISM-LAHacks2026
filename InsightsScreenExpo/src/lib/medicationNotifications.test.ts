/**
 * Medication notification helper tests.
 * Run: npx tsx --test src/lib/medicationNotifications.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MedicationSchedule } from '../constants/medications';
import { fireDateForMedication, medicationNotificationId } from './medicationNotifications';

function makeSchedule(overrides: Partial<MedicationSchedule> = {}): MedicationSchedule {
  return {
    id: 'med-1',
    dayKey: '2026-06-10',
    name: 'Metformin',
    takenAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('medicationNotificationId', () => {
  it('prefixes schedule id', () => {
    assert.equal(medicationNotificationId('med-1'), 'med-reminder:med-1');
  });
});

describe('fireDateForMedication', () => {
  it('uses selected hour and minute on the schedule day', () => {
    const fireAt = fireDateForMedication(makeSchedule({ timeHour: 14, timeMinute: 30 }));
    assert.ok(fireAt);
    assert.equal(fireAt.getFullYear(), 2026);
    assert.equal(fireAt.getMonth(), 5);
    assert.equal(fireAt.getDate(), 10);
    assert.equal(fireAt.getHours(), 14);
    assert.equal(fireAt.getMinutes(), 30);
  });

  it('defaults to 9:00 when no time is set', () => {
    const fireAt = fireDateForMedication(makeSchedule());
    assert.ok(fireAt);
    assert.equal(fireAt.getHours(), 9);
    assert.equal(fireAt.getMinutes(), 0);
  });
});
