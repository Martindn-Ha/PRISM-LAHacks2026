import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import type { InsightTab } from '../../constants/insights';

type Props = {
  metric: InsightTab;
  color?: string;
  size?: number;
  strokeWidth?: number;
};

export function InsightTabIcon({ metric, color = '#cbd5e1', size = 22, strokeWidth = 1.8 }: Props) {
  const common = {
    fill: 'none' as const,
    stroke: color,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth,
  };

  switch (metric) {
    case 'Heart Rate':
    case 'Resting Heart Rate':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M12 20.1s-6.4-4.4-8.4-7.5A4.9 4.9 0 0 1 12 6a4.9 4.9 0 0 1 8.4 6.6c-2 3.1-8.4 7.5-8.4 7.5Z" />
          {metric === 'Resting Heart Rate' ? <Path {...common} d="M8.4 12h7.2" /> : <Path {...common} d="M7.2 12h2.2l1.1-2.4 2.5 4.8 1.1-2.4h2.7" />}
        </Svg>
      );
    case 'Heart Rate Variability':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M3 12h3l1.5-3 3 6 2-4h2.2l1.4 3H21" />
          <Path {...common} d="M3 18h18" opacity={0.5} />
        </Svg>
      );
    case 'Walking Heart Rate':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M12 20.1s-6.4-4.4-8.4-7.5A4.9 4.9 0 0 1 12 6a4.9 4.9 0 0 1 8.4 6.6c-2 3.1-8.4 7.5-8.4 7.5Z" />
          <Ellipse {...common} cx={7.5} cy={17.5} rx={1.8} ry={2.6} />
          <Ellipse {...common} cx={14.8} cy={15.2} rx={2} ry={3} />
        </Svg>
      );
    case 'Respiratory Rate':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M5 14c2.4 0 2.4-4 4.8-4s2.4 4 4.8 4s2.4-4 4.8-4" />
          <Path {...common} d="M5 10c2.4 0 2.4 4 4.8 4s2.4-4 4.8-4s2.4 4 4.8 4" opacity={0.55} />
        </Svg>
      );
    case 'Blood Oxygen':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M12 3.8c-3.1 3.8-5.2 6.3-5.2 9a5.2 5.2 0 0 0 10.4 0c0-2.7-2.1-5.2-5.2-9Z" />
          <Path {...common} d="M9.4 13.2h5.2" />
        </Svg>
      );
    case 'Steps':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Ellipse {...common} cx={9} cy={8} rx={2.3} ry={3.4} />
          <Ellipse {...common} cx={15.2} cy={14.8} rx={2.7} ry={4} />
        </Svg>
      );
    case 'Walking + Running Distance':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M4.5 18.5 19.5 5.5" />
          <Path {...common} d="m13.7 5.5 5.8 0 0 5.8" />
          <Path {...common} d="M4.5 12.7v5.8h5.8" />
        </Svg>
      );
    case 'Flights Climbed':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M2.8 20h4.6v-3.8H12V12h4.6V7.8H21.2" />
        </Svg>
      );
    case 'Active Energy':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="m13.5 3.8-6 8h4l-1 8.4 6-8h-4l1-8.4Z" />
        </Svg>
      );
    case 'Resting Energy':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle {...common} cx={12} cy={12} r={6.4} />
          <Circle {...common} cx={12} cy={12} r={2.3} />
        </Svg>
      );
    case 'Exercise Minutes':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle {...common} cx={12} cy={13} r={6.6} />
          <Path {...common} d="M12 13V9.5M12 13l2.8 1.6" />
          <Path {...common} d="M9.2 4.8h5.6" />
        </Svg>
      );
    case 'Stand Minutes':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M12 18.8V5.2" />
          <Path {...common} d="m9.5 7.8 2.5-2.6 2.5 2.6M9.5 16.2l2.5 2.6 2.5-2.6" />
        </Svg>
      );
    case 'Sleep':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M15.8 4.8a6.8 6.8 0 1 0 3.4 12.7A6.1 6.1 0 1 1 15.8 4.8Z" />
        </Svg>
      );
    case 'Workouts':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M6.5 8.5 17.5 15.5M17.5 8.5 6.5 15.5" />
          <Circle {...common} cx={6.5} cy={8.5} r={2.2} />
          <Circle {...common} cx={17.5} cy={15.5} r={2.2} />
        </Svg>
      );
    case 'Deep Sleep':
    case 'REM Sleep':
    case 'Core Sleep':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M15.8 4.8a6.8 6.8 0 1 0 3.4 12.7A6.1 6.1 0 1 1 15.8 4.8Z" />
          {metric === 'Deep Sleep' ? <Path {...common} d="M8 14h8" opacity={0.55} /> : null}
          {metric === 'REM Sleep' ? <Path {...common} d="M7 12c2 2 8 2 10 0" opacity={0.55} /> : null}
        </Svg>
      );
    case 'Body Temperature':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M12 5.2v8.3" />
          <Circle {...common} cx={12} cy={16.2} r={3.8} />
          <Rect {...common} height={8.6} rx={2} width={4} x={10} y={4.2} />
        </Svg>
      );
    case 'Cardio Fitness':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M12 20.1s-6.4-4.4-8.4-7.5A4.9 4.9 0 0 1 12 6a4.9 4.9 0 0 1 8.4 6.6c-2 3.1-8.4 7.5-8.4 7.5Z" />
          <Path {...common} d="M8 13.2 11 10l2 2 3-3" />
        </Svg>
      );
    case 'Blood Glucose':
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Path {...common} d="M12 2.2c-4.1 4.9-6.9 8-6.9 11.6a6.9 6.9 0 0 0 13.8 0c0-3.6-2.8-6.7-6.9-11.6Z" />
          <Path {...common} d="M9.1 13.5h5.8M12 10.6v5.8" />
        </Svg>
      );
    default:
      return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
          <Circle {...common} cx={12} cy={12} r={7} />
        </Svg>
      );
  }
}
