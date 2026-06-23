/** Format a single trend point for axis / callouts (no trailing .0). */
export function formatTrendPointValue(v: number): string {
  if (!Number.isFinite(v) || !(v > 0)) {
    return '0';
  }
  const s = v.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

const DEFAULT_WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/** Coerce Health / demo series into finite non-negative numbers (avoids NaN in SVG paths). */
export function sanitizeInsightTrendPoints(raw: unknown[] | null | undefined): number[] {
  const arr = Array.isArray(raw) ? raw : [];
  if (arr.length === 0) {
    return [0, 0, 0, 0, 0, 0, 0];
  }
  return arr.map((v) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 0) {
      return 0;
    }
    return n;
  });
}

/** Keep one label per point; pad or trim so charts never read past `labels.length`. */
export function alignTrendLabelsForPoints(n: number, provided?: string[] | null): string[] {
  const p = Array.isArray(provided) ? provided : [];
  if (p.length === n) {
    return [...p];
  }
  return Array.from({ length: n }, (_, i) => p[i] ?? DEFAULT_WEEKDAY_LABELS[i % DEFAULT_WEEKDAY_LABELS.length]!);
}

/**
 * Pick a small set of day indices for the dense-chart x-axis so labels can sit
 * at correct x positions without overlapping. Uses label text (non '·') plus ends.
 */
export function buildDenseAxisTickIndices(
  labels: string[],
  n: number,
  xByIndex: number[],
  options?: { minGapPx?: number; maxTicks?: number },
): number[] {
  if (!Number.isFinite(n) || n < 1 || !Array.isArray(xByIndex) || xByIndex.length < n) {
    return [];
  }
  const minGap = options?.minGapPx ?? 54;
  const maxTicks = options?.maxTicks ?? 10;

  const candidates = new Set<number>([0]);
  if (n > 1) {
    candidates.add(n - 1);
  }
  for (let i = 0; i < n; i++) {
    if (labels[i] !== '·') {
      candidates.add(i);
    }
  }

  const sorted = [...candidates].sort((a, b) => a - b);
  const spaced: number[] = [];
  for (const idx of sorted) {
    if (spaced.length === 0) {
      spaced.push(idx);
      continue;
    }
    const x = xByIndex[idx];
    const prevX = xByIndex[spaced[spaced.length - 1]];
    if (!Number.isFinite(x) || !Number.isFinite(prevX)) {
      continue;
    }
    if (x - prevX >= minGap) {
      spaced.push(idx);
    } else if (idx === n - 1) {
      spaced[spaced.length - 1] = idx;
    }
  }

  let out = [...new Set(spaced)].sort((a, b) => a - b);
  if (out.length <= maxTicks) {
    return out;
  }

  const first = out[0];
  const last = out[out.length - 1];
  const middle = out.slice(1, -1);
  const innerSlots = Math.max(0, maxTicks - 2);
  const inner: number[] = [];
  if (innerSlots > 0 && middle.length > 0) {
    for (let k = 0; k < innerSlots; k++) {
      const t = innerSlots === 1 ? 0.5 : k / (innerSlots - 1);
      const j = Math.round(t * (middle.length - 1));
      inner.push(middle[j]);
    }
  }
  out = [...new Set([first, ...inner, last])].sort((a, b) => a - b);
  return out;
}

/** Map chart-space x to the width the chart is actually drawn at. */
export function scaleChartX(x: number, chartWidth: number, displayWidth: number): number {
  if (!Number.isFinite(x) || chartWidth <= 0 || displayWidth <= 0) {
    return 0;
  }
  return (x / chartWidth) * displayWidth;
}

/** Y-axis range with padded min/max and ~4 tick marks (Apple-style). */
export type ChartYRange = { min: number; max: number; ticks: number[] };

export function buildChartYRange(values: number[], paddingPct = 0.12): ChartYRange {
  const finite = values.filter((v) => Number.isFinite(v) && v > 0);
  if (finite.length === 0) {
    return { min: 0, max: 100, ticks: [0, 50, 100] };
  }
  const rawMin = Math.min(...finite);
  const rawMax = Math.max(...finite);
  const span = Math.max(rawMax - rawMin, rawMax * 0.08, 1);
  const pad = span * paddingPct;
  const min = Math.floor(rawMin - pad);
  const max = Math.ceil(rawMax + pad);
  const step = Math.max(1, Math.round((max - min) / 3));
  const ticks: number[] = [];
  for (let t = min; t <= max; t += step) {
    ticks.push(t);
  }
  if (ticks[ticks.length - 1] !== max) {
    ticks.push(max);
  }
  return { min, max, ticks };
}

export function formatIntradayTimeLabel(atMs: number): string {
  const d = new Date(atMs);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', '');
}

/** Place an axis label under its tick without clipping the first/last labels. */
export function placeAxisLabelLeft(
  cx: number,
  idx: number,
  n: number,
  labelW: number,
  displayWidth: number,
  chartWidth: number,
): number {
  const x = scaleChartX(cx, chartWidth, displayWidth);
  if (idx <= 0) {
    return 0;
  }
  if (idx >= n - 1) {
    return Math.max(0, displayWidth - labelW);
  }
  return Math.min(displayWidth - labelW, Math.max(0, Math.round(x - labelW / 2)));
}
