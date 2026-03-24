import Svg, { Path, Circle } from 'react-native-svg';

type Props = { size?: number; color?: string };

export function AISparkleIcon({ size = 24, color = '#fff' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* 4-pointed sparkle chính */}
      <Path
        d="M12 1 L13.3 10.7 L23 12 L13.3 13.3 L12 23 L10.7 13.3 L1 12 L10.7 10.7 Z"
        fill={color}
      />
      {/* Chấm nhỏ trang trí */}
      <Circle cx="19.5" cy="4.5" r="1.3" fill={color} opacity={0.65} />
      <Circle cx="4.5" cy="19.5" r="1" fill={color} opacity={0.45} />
      <Circle cx="19.5" cy="19" r="0.8" fill={color} opacity={0.35} />
    </Svg>
  );
}
