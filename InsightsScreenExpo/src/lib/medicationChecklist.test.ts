/**
 * Medication schedule tests.
 * Run: npm run test:medications
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MedicationSchedule } from '../constants/medications';
import {
  dayAdherence,
  nextPendingSchedulePreview,
  schedulesForDay,
  serializeMedicationSchedulesForExport,
} from './medicationChecklist';
import { buildMonthCalendar, dayKeysWithSchedules } from './medicationCalendar';

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

describe('schedulesForDay', () => {
  it('returns active schedules for a day', () => {
    const rows = schedulesForDay(
      [makeSchedule(), makeSchedule({ id: 'med-2', name: 'Aspirin' }), makeSchedule({ id: 'med-3', deletedAt: '2026-06-09T00:00:00.000Z' })],
      '2026-06-10',
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.name, 'Aspirin');
    assert.equal(rows[1]?.name, 'Metformin');
  });
});

describe('dayAdherence', () => {
  it('counts taken vs total schedules', () => {
    const adherence = dayAdherence(
      [makeSchedule({ takenAt: '2026-06-10T08:00:00.000Z' }), makeSchedule({ id: 'med-2', name: 'Aspirin' })],
      '2026-06-10',
    );
    assert.equal(adherence.taken, 1);
    assert.equal(adherence.total, 2);
  });
});

describe('nextPendingSchedulePreview', () => {
  it('lists pending medicine names', () => {
    const preview = nextPendingSchedulePreview(
      [makeSchedule(), makeSchedule({ id: 'med-2', name: 'Aspirin', takenAt: '2026-06-10T08:00:00.000Z' })],
      '2026-06-10',
      2,
    );
    assert.equal(preview.length, 1);
    assert.equal(preview[0], 'Metformin');
  });
});

describe('buildMonthCalendar', () => {
  it('pads June 2026 to full weeks', () => {
    const cells = buildMonthCalendar(2026, 5, '2026-06-22');
    assert.equal(cells.length % 7, 0);
    assert.equal(cells.filter((cell) => cell.dayKey != null).length, 30);
  });
});

describe('dayKeysWithSchedules', () => {
  it('collects unique active day keys', () => {
    const keys = dayKeysWithSchedules([
      makeSchedule(),
      makeSchedule({ id: 'med-2', dayKey: '2026-06-11' }),
      makeSchedule({ id: 'med-3', deletedAt: '2026-06-09T00:00:00.000Z' }),
    ]);
    assert.equal(keys.size, 2);
    assert.ok(keys.has('2026-06-10'));
    assert.ok(keys.has('2026-06-11'));
  });
});

describe('serializeMedicationSchedulesForExport', () => {
  it('includes deleted status', () => {
    const rows = serializeMedicationSchedulesForExport([
      makeSchedule(),
      makeSchedule({ id: 'med-2', deletedAt: '2026-06-15T00:00:00.000Z' }),
    ]);
    assert.equal(rows[0]?.status, 'active');
    assert.equal(rows[1]?.status, 'deleted');
  });
});
