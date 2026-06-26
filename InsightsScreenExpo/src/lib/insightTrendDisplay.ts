export type LabeledTrendDay = {
  index: number;
  value: number;
  dayLabel: string;
};

export function todayTrendValue(trendPoints: number[]): number {
  return trendPoints[trendPoints.length - 1] ?? 0;
}

export function yesterdayTrendValue(trendPoints: number[]): number {
  const index = trendPoints.length - 2;
  return index >= 0 ? trendPoints[index] ?? 0 : 0;
}

export function formatInsightDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatInsightDayLabels(dates: Date[]): string[] {
  return dates.map(formatInsightDayLabel);
}

/** Last day in a trend with a positive value — for sparse metrics (VO₂, wrist temp). */
export function resolveLastRecordedTrendDay(
  trendPoints: number[],
  dayLabels: string[],
): LabeledTrendDay | null {
  for (let index = trendPoints.length - 1; index >= 0; index -= 1) {
    const value = trendPoints[index] ?? 0;
    if (value > 0) {
      return { index, value, dayLabel: dayLabels[index] ?? '' };
    }
  }
  return null;
}

/** Hub rows must match the explicit value set alongside each summary. */
export function insightDisplayValue(content: {
  hubValue?: number;
  trendPoints: number[];
}): number {
  if (content.hubValue != null && Number.isFinite(content.hubValue)) {
    return content.hubValue;
  }
  return todayTrendValue(content.trendPoints);
}
