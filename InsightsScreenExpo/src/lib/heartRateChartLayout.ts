import type { InsightChartPeriod } from '../constants/insights';
import type { ChartYRange } from './insightChartAxis';

export const HEART_RATE_Y_AXIS_W = 36;
export const HEART_RATE_CHART_H = 200;
export const HEART_RATE_PAD_TOP = 8;
export const HEART_RATE_INTRADAY_PAD_BOTTOM = 26;
export const HEART_RATE_RANGE_PAD_BOTTOM = 34;

export function heartRatePlotWidth(pageWidth: number): number {
  return Math.max(pageWidth - HEART_RATE_Y_AXIS_W, 120);
}

export function heartRateYAxisSide(_period: InsightChartPeriod): 'left' | 'right' {
  return 'right';
}

export function heartRateShowsHorizontalGrid(period: InsightChartPeriod): boolean {
  return period === 'W' || period === 'M' || period === 'Y';
}

export function heartRatePlotPadBottom(period: InsightChartPeriod): number {
  return heartRateShowsHorizontalGrid(period) ? HEART_RATE_RANGE_PAD_BOTTOM : HEART_RATE_INTRADAY_PAD_BOTTOM;
}

export function heartRatePlotMetrics(yRange: ChartYRange, padBottom: number) {
  const innerH = HEART_RATE_CHART_H - HEART_RATE_PAD_TOP - padBottom;
  const ySpan = Math.max(yRange.max - yRange.min, 1);
  const toY = (value: number) => HEART_RATE_PAD_TOP + (1 - (value - yRange.min) / ySpan) * innerH;
  const baselineY = HEART_RATE_PAD_TOP + innerH;
  return { innerH, ySpan, toY, baselineY };
}

/** Left-align label box so its leading edge sits on the tick mark. */
export function heartRateTickLabelLeft(tickX: number, labelW: number, innerW: number): number {
  return Math.min(Math.max(tickX, 0), innerW - labelW);
}
