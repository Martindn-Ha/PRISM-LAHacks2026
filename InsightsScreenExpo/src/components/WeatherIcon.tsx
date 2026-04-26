import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { weatherCodeToIconKind, type WeatherIconKind } from '../services/weatherService';

type Props = {
  weatherCode: number;
  size?: number;
};

const SUN = '#facc15';
const CLOUD = '#cbd5e1';
const CLOUD_DIM = '#94a3b8';
const RAIN = '#60a5fa';
const SNOW = '#e0f2fe';
const BOLT = '#fbbf24';
const FOG = '#94a3b8';

/** Shared puffy cloud outline (24×24). */
function CloudOutline({ stroke = CLOUD }: { stroke?: string }) {
  return (
    <Path
      d="M18 11h-.5A4.5 4.5 0 0 0 5.2 9.7 3.5 3.5 0 0 0 6 17h11a4 4 0 0 0 1-7.9z"
      fill="none"
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.65}
    />
  );
}

/** Sun disk + eight rays; rays start on the circle and extend outward so the icon stays visually centered. */
function SunRays({
  cx,
  cy,
  r,
  rayLen = 2.85,
  rayStroke = 1.42,
}: {
  cx: number;
  cy: number;
  r: number;
  rayLen?: number;
  rayStroke?: number;
}) {
  const rays = Array.from({ length: 8 }, (_, k) => {
    const t = -Math.PI / 2 + (k * Math.PI) / 4;
    const c = Math.cos(t);
    const s = Math.sin(t);
    return (
      <Line
        key={k}
        stroke={SUN}
        strokeLinecap="round"
        strokeWidth={rayStroke}
        x1={cx + r * c}
        y1={cy + r * s}
        x2={cx + (r + rayLen) * c}
        y2={cy + (r + rayLen) * s}
      />
    );
  });
  return (
    <>
      <Circle cx={cx} cy={cy} fill={SUN} opacity={0.96} r={r} />
      {rays}
    </>
  );
}

function IconBody({ kind }: { kind: WeatherIconKind }) {
  switch (kind) {
    case 'clear':
      return <SunRays cx={12} cy={12} r={3.65} rayLen={3.1} rayStroke={1.45} />;
    case 'mostly_clear':
      return (
        <>
          <G opacity={0.95}>
            <SunRays cx={14} cy={10} r={2.75} rayLen={2.35} rayStroke={1.2} />
          </G>
          <Path
            d="M5 18h8a3 3 0 0 0 0-5.5h-.3A3.5 3.5 0 0 0 4 15.5 2.5 2.5 0 0 0 5 18z"
            fill="none"
            stroke={CLOUD_DIM}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.35}
          />
        </>
      );
    case 'partly_cloudy':
      return (
        <>
          <G opacity={0.9}>
            <SunRays cx={15.5} cy={9} r={2.45} rayLen={2.2} rayStroke={1.15} />
          </G>
          <Path
            d="M5 19h11a3.8 3.8 0 0 0 .2-7.6A5 5 0 0 0 5 12a3.2 3.2 0 0 0 0 7z"
            fill="none"
            stroke={CLOUD}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.65}
          />
        </>
      );
    case 'cloudy':
      return <CloudOutline />;
    case 'fog':
      return (
        <>
          <CloudOutline stroke={CLOUD_DIM} />
          <Line opacity={0.85} stroke={FOG} strokeLinecap="round" strokeWidth={1.25} x1={3.5} x2={20.5} y1={19.2} y2={19.2} />
          <Line opacity={0.85} stroke={FOG} strokeLinecap="round" strokeWidth={1.25} x1={5} x2={17} y1={20.8} y2={20.8} />
          <Line opacity={0.85} stroke={FOG} strokeLinecap="round" strokeWidth={1.25} x1={4} x2={19} y1={22.4} y2={22.4} />
        </>
      );
    case 'drizzle':
      return (
        <>
          <CloudOutline />
          <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.35} x1={8} x2={8} y1={17.5} y2={20.5} />
          <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.35} x1={12} x2={12} y1={17} y2={20} />
          <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.35} x1={16} x2={16} y1={17.5} y2={20.5} />
        </>
      );
    case 'rain':
      return (
        <>
          <CloudOutline />
          <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.45} x1={7} x2={7} y1={16.5} y2={21.5} />
          <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.45} x1={10.5} x2={10.5} y1={16} y2={22} />
          <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.45} x1={14} x2={14} y1={16.5} y2={21.5} />
          <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.45} x1={17.5} x2={17.5} y1={16} y2={22} />
        </>
      );
    case 'showers':
      return (
        <>
          <CloudOutline />
          <G transform="rotate(16 12 18.5)">
            <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.5} x1={6} x2={5} y1={16} y2={21} />
            <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.5} x1={10} x2={9} y1={15.5} y2={21.5} />
            <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.5} x1={14} x2={13} y1={15.5} y2={21.5} />
            <Line stroke={RAIN} strokeLinecap="round" strokeWidth={1.5} x1={18} x2={17} y1={16} y2={21} />
          </G>
        </>
      );
    case 'snow':
      return (
        <>
          <CloudOutline />
          <G opacity={0.95} stroke={SNOW} strokeLinecap="round">
            <Line strokeWidth={1.15} x1={8} x2={8} y1={17.2} y2={21.2} />
            <Line strokeWidth={1.15} x1={6.3} x2={9.7} y1={19.2} y2={19.2} />
            <Line strokeWidth={1.15} x1={12} x2={12} y1={16.8} y2={20.8} />
            <Line strokeWidth={1.15} x1={10.3} x2={13.7} y1={18.8} y2={18.8} />
            <Line strokeWidth={1.15} x1={16} x2={16} y1={17.2} y2={21.2} />
            <Line strokeWidth={1.15} x1={14.3} x2={17.7} y1={19.2} y2={19.2} />
          </G>
        </>
      );
    case 'thunderstorm':
      return (
        <>
          <CloudOutline stroke={CLOUD_DIM} />
          <Path
            d="M12 15.2 L8.6 21.4 H11 L9.6 24.2 L15.4 19.4 H12.4 L13.8 15.2 Z"
            fill={BOLT}
            stroke="#f59e0b"
            strokeLinejoin="round"
            strokeWidth={0.45}
          />
        </>
      );
    default:
      return (
        <>
          <CloudOutline stroke={CLOUD_DIM} />
          <Circle cx={12} cy={19} fill="none" opacity={0.7} r={1.2} stroke={CLOUD_DIM} strokeWidth={1.2} />
          <Path d="M12 15v-2.5" opacity={0.7} stroke={CLOUD_DIM} strokeLinecap="round" strokeWidth={1.2} />
        </>
      );
  }
}

export default function WeatherIcon({ weatherCode, size = 34 }: Props) {
  const kind = weatherCodeToIconKind(weatherCode);
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <IconBody kind={kind} />
    </Svg>
  );
}
