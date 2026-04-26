/** Format a single trend point for axis / callouts (no trailing .0). */
export function formatTrendPointValue(v: number): string {
  if (!(v > 0)) {
    return '0';
  }
  const s = v.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
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
