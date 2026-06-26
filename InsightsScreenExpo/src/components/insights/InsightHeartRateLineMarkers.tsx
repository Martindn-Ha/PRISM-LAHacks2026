import { Circle, Polyline } from 'react-native-svg';

export type LineChartPoint = { x: number; y: number };

type Props = {
  /** Step or interpolated line vertices. */
  linePoints: LineChartPoint[];
  /** Hollow markers — defaults to linePoints when omitted. */
  markerPoints?: LineChartPoint[];
  color: string;
  pointRadius?: number;
  strokeWidth?: number;
  sharpSteps?: boolean;
};

export function InsightHeartRateLineMarkers({
  linePoints,
  markerPoints,
  color,
  pointRadius = 4.5,
  strokeWidth = 2,
  sharpSteps = false,
}: Props) {
  if (linePoints.length === 0) {
    return null;
  }

  const markers = markerPoints ?? linePoints;
  const polylinePoints = linePoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <>
      {linePoints.length > 1 ? (
        <Polyline
          fill="none"
          points={polylinePoints}
          stroke={color}
          strokeLinecap={sharpSteps ? 'butt' : 'round'}
          strokeLinejoin={sharpSteps ? 'miter' : 'round'}
          strokeWidth={strokeWidth}
        />
      ) : null}
      {markers.map((point, idx) => (
        <Circle
          key={`line-point-${idx}`}
          cx={point.x}
          cy={point.y}
          fill="transparent"
          r={pointRadius}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      ))}
    </>
  );
}
