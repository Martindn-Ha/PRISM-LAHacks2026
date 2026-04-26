import Svg, { Path } from 'react-native-svg';

export function ActivityMiniIcon({ label }: { label: string }) {
  if (label === 'STEPS') {
    return (
      <Svg height={14} viewBox="0 0 12 12" width={14}>
        <Path d="M2 9l2-3l2 1l2-4l2 1" fill="none" stroke="#a1a1aa" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
      </Svg>
    );
  }
  if (label === 'SLEEP') {
    return (
      <Svg height={14} viewBox="0 0 12 12" width={14}>
        <Path d="M8 2.2A3.9 3.9 0 1 0 9.8 8A3 3 0 1 1 8 2.2z" fill="none" stroke="#a1a1aa" strokeWidth={1.3} />
      </Svg>
    );
  }
  if (label === 'MEDS') {
    return (
      <Svg height={14} viewBox="0 0 12 12" width={14}>
        <Path d="M6 2v8M2 6h8" fill="none" stroke="#a1a1aa" strokeLinecap="round" strokeWidth={1.5} />
      </Svg>
    );
  }
  return (
    <Svg height={14} viewBox="0 0 12 12" width={14}>
      <Path d="M6 1.8c-1.4 2.2-2.4 3.6-2.4 5A2.4 2.4 0 1 0 8.4 6.8c0-1.4-1-2.8-2.4-5z" fill="none" stroke="#a1a1aa" strokeWidth={1.3} />
    </Svg>
  );
}

export function InsightsBulbIcon({ active }: { active: boolean }) {
  const color = active ? '#3b82f6' : '#52525b';
  return (
    <Svg height={26} viewBox="0 0 24 24" width={26}>
      <Path
        d="M12 3.2a6.4 6.4 0 0 0-4.3 11.1c.9.8 1.6 1.9 1.9 3h4.8c.3-1.1 1-2.2 1.9-3A6.4 6.4 0 0 0 12 3.2Z"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path
        d="M9.7 19h4.6M10.3 21h3.4"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}
