import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHeartRateChartData,
  canStepHeartRateFuture,
  canStepHeartRatePast,
  defaultHeartRateDayIndex,
  getHeartRateHourWindow,
  getHeartRateMonthBuckets,
  getHeartRateWeekBuckets,
  getHeartRateYearBuckets,
  heartRateFixedYRange,
  heartRateHeroForPeriod,
  heartRateHourAxisLabelTicks,
  heartRateHourAxisTicks,
  heartRatePeriodRangeLabel,
  startOfLocalDay,
} from './heartRateChartData';

function formatClockShortForTest(atMs: number): string {
  return new Date(atMs)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' ', '');
}

describe('buildHeartRateChartData', () => {
  it('builds daily min/max and intraday samples', () => {
    const anchor = new Date('2026-06-21T15:00:00');
    const day = startOfLocalDay(anchor);
    const samples = [
      { value: 70, atMs: day.getTime() + 60 * 60 * 1000 },
      { value: 110, atMs: day.getTime() + 2 * 60 * 60 * 1000 },
    ];
    const chart = buildHeartRateChartData(samples, anchor);
    const today = chart.days[chart.days.length - 1]!;
    assert.equal(today.min, 70);
    assert.equal(today.max, 110);
    assert.equal(today.samples.length, 2);
  });

  it('shows range hero for week period', () => {
    const anchor = new Date('2026-06-18T12:00:00');
    const todayStart = startOfLocalDay(anchor).getTime();
    const chart = buildHeartRateChartData(
      [
        { value: 60, atMs: todayStart },
        { value: 120, atMs: todayStart - 24 * 60 * 60 * 1000 },
      ],
      anchor,
    );
    const hero = heartRateHeroForPeriod('W', chart, 0, anchor.getTime(), todayStart);
    assert.equal(hero.context, 'RANGE');
    assert.match(hero.primary, /60/);
    assert.match(hero.primary, /120/);
  });
});

describe('getHeartRateHourWindow', () => {
  it('returns samples from the selected hour window', () => {
    const nowMs = new Date('2026-06-21T15:30:00').getTime();
    const recent = nowMs - 20 * 60 * 1000;
    const old = nowMs - 90 * 60 * 1000;
    const chart = buildHeartRateChartData(
      [
        { value: 80, atMs: recent },
        { value: 70, atMs: old },
      ],
      new Date(nowMs),
    );
    const window = getHeartRateHourWindow(chart, nowMs);
    assert.equal(window.samples.length, 1);
    assert.equal(window.samples[0]!.value, 80);
  });

  it('aligns to clock-hour boundaries so ticks start at :00', () => {
    const nowMs = new Date('2026-06-21T23:37:00').getTime();
    const chart = buildHeartRateChartData([], new Date(nowMs));
    const window = getHeartRateHourWindow(chart, nowMs);
    const start = new Date(window.windowStartMs);
    assert.equal(start.getMinutes(), 0);
    assert.equal(start.getSeconds(), 0);
    assert.equal(start.getHours(), 23);
  });
});

describe('swipe navigation', () => {
  it('uses Sunday–Saturday calendar weeks', () => {
    const anchor = new Date('2026-06-21T12:00:00');
    const todayStart = startOfLocalDay(anchor).getTime();
    const chart = buildHeartRateChartData([{ value: 72, atMs: todayStart }], anchor);
    const currentWeek = getHeartRateWeekBuckets(chart, 0, todayStart);
    assert.equal(currentWeek.length, 7);
    assert.equal(new Date(currentWeek[0]!.dayStartMs).getDay(), 0);
    assert.equal(new Date(currentWeek[6]!.dayStartMs).getDay(), 6);
    const previousWeek = getHeartRateWeekBuckets(chart, 1, todayStart);
    assert.equal(previousWeek.length, 7);
    assert.equal(new Date(previousWeek[0]!.dayStartMs).getDay(), 0);
    assert.ok(canStepHeartRatePast('W', chart, 0, anchor.getTime(), todayStart));
    assert.ok(canStepHeartRatePast('D', chart, 0, anchor.getTime(), todayStart));
    assert.equal(canStepHeartRateFuture('D', 0), false);
    assert.equal(canStepHeartRateFuture('D', 1), true);
    assert.equal(canStepHeartRateFuture('Y', 0), false);
  });

  it('allows hour swipes before samples finish loading', () => {
    const anchor = new Date('2026-06-21T15:30:00');
    const todayStart = startOfLocalDay(anchor).getTime();
    const nowMs = anchor.getTime();
    const chart = buildHeartRateChartData([], anchor);
    assert.ok(canStepHeartRatePast('H', chart, 0, nowMs, todayStart));
    assert.ok(canStepHeartRatePast('D', chart, 0, nowMs, todayStart));
  });

  it('allows month swipes when the previous month overlaps loaded daily data', () => {
    const anchor = new Date('2026-06-21T12:00:00');
    const todayStart = startOfLocalDay(anchor).getTime();
    const nowMs = anchor.getTime();
    const chart = buildHeartRateChartData([{ value: 72, atMs: todayStart }], anchor);
    const june = getHeartRateMonthBuckets(chart, 0, nowMs);
    assert.equal(june.length, 30);
    const may = getHeartRateMonthBuckets(chart, 1, nowMs);
    assert.equal(may.length, 31);
    assert.ok(canStepHeartRatePast('M', chart, 0, nowMs, todayStart));
  });

  it('builds Jan–Dec buckets for the current calendar year', () => {
    const anchor = new Date('2026-06-21T12:00:00');
    const todayStart = startOfLocalDay(anchor).getTime();
    const nowMs = anchor.getTime();
    const juneMs = new Date(2026, 5, 15).getTime();
    const chart = buildHeartRateChartData([{ value: 80, atMs: juneMs }], anchor);
    const year = getHeartRateYearBuckets(chart, nowMs);
    assert.equal(year.length, 12);
    assert.equal(new Date(year[0]!.monthStartMs).getMonth(), 0);
    assert.equal(new Date(year[11]!.monthStartMs).getMonth(), 11);
    assert.equal(year[5]!.max, 80);
    assert.equal(heartRatePeriodRangeLabel('Y', chart, 0, nowMs), '2026');
    assert.equal(canStepHeartRatePast('Y', chart, 0, nowMs, todayStart), false);
  });

  it('labels hour windows using the same aligned range as the chart', () => {
    const nowMs = new Date('2026-06-21T15:37:00').getTime();
    const chart = buildHeartRateChartData([], new Date(nowMs));
    const window = getHeartRateHourWindow(chart, nowMs);
    const label = heartRatePeriodRangeLabel('H', chart, 0, nowMs);
    assert.equal(label, `${formatClockShortForTest(window.windowStartMs)} – ${formatClockShortForTest(window.windowEndMs)}`);
  });
});

describe('heartRateFixedYRange', () => {
  it('always uses Apple Health 0–150 BPM scale', () => {
    const anchor = new Date('2026-06-21T15:30:00');
    const todayStart = startOfLocalDay(anchor).getTime();
    const chart = buildHeartRateChartData(
      [
        { value: 60, atMs: todayStart },
        { value: 140, atMs: todayStart - 24 * 60 * 60 * 1000 },
      ],
      anchor,
    );
    assert.deepEqual(heartRateFixedYRange('D', chart), { min: 0, max: 150, ticks: [0, 50, 100, 150] });
  });

  it('omits trailing hour label shared with the next swipe page', () => {
    const windowStart = new Date('2026-06-21T14:30:00').getTime();
    const grid = heartRateHourAxisTicks(windowStart);
    const labels = heartRateHourAxisLabelTicks(windowStart);
    assert.equal(grid.length, 5);
    assert.equal(labels.length, 4);
    assert.equal(labels[labels.length - 1], grid[grid.length - 2]);
  });
});

describe('defaultHeartRateDayIndex', () => {
  it('prefers today when it has samples', () => {
    const anchor = new Date('2026-06-21T12:00:00');
    const today = startOfLocalDay(anchor);
    const chart = buildHeartRateChartData([{ value: 72, atMs: today.getTime() }], anchor);
    assert.equal(defaultHeartRateDayIndex(chart, today.getTime()), chart.days.length - 1);
  });
});
