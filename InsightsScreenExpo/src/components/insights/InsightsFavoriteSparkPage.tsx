import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { InsightContent, InsightTab } from '../../constants/insights';

type Props = {
  metric: InsightTab;
  content: InsightContent;
  pageWidth: number;
  theme: string;
  iconGlyph: string;
};

export function InsightsFavoriteSparkPage({ metric, content, pageWidth, theme, iconGlyph }: Props) {
  const points = content.trendPoints ?? [0, 0, 0, 0, 0, 0, 0];
  const labels = content.trendLabels ?? ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const chartWidth = Math.max(200, Math.floor(pageWidth));
  const chartHeight = 96;
  const graphPaddingX = 10;
  const graphPaddingY = 12;
  const max = Math.max(...points, 1);
  const usableWidth = chartWidth - graphPaddingX * 2;
  const usableHeight = chartHeight - graphPaddingY * 2;
  const stepX = points.length > 1 ? usableWidth / (points.length - 1) : usableWidth;
  const coords = points.map((value, idx) => {
    const x = graphPaddingX + idx * stepX;
    const y = graphPaddingY + (1 - value / max) * usableHeight;
    return { x, y, value };
  });
  const pathD = coords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const midY = graphPaddingY + usableHeight / 2;

  return (
    <View style={{ width: pageWidth, paddingVertical: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Text style={{ fontSize: 22, color: theme }}>{iconGlyph}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#93c5fd', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>FAVORITE</Text>
          <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 }}>{metric}</Text>
        </View>
        <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>{content.trendUnit}</Text>
      </View>
      <Svg height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%">
        <Path
          d={`M ${graphPaddingX} ${chartHeight - graphPaddingY} L ${chartWidth - graphPaddingX} ${chartHeight - graphPaddingY}`}
          stroke="rgba(148,163,184,0.16)"
          strokeWidth={1}
        />
        <Path
          d={`M ${graphPaddingX} ${midY} L ${chartWidth - graphPaddingX} ${midY}`}
          stroke="rgba(148,163,184,0.1)"
          strokeDasharray="4 6"
          strokeWidth={1}
        />
        <Path d={pathD} fill="none" stroke={theme} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} />
        {coords.map((pt, idx) => (
          <Circle key={`${metric}-spark-${idx}`} cx={pt.x} cy={pt.y} fill="#0f172a" r={3.2} stroke={theme} strokeWidth={1.8} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        {labels.map((label, idx) => (
          <View key={`${metric}-spark-lbl-${idx}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#e2e8f0', fontSize: 10, fontWeight: '800' }}>
              {points[idx] > 0 ? String(points[idx].toFixed(1)).replace(/\.0$/, '') : '0'}
            </Text>
            <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '700', marginTop: 2 }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
