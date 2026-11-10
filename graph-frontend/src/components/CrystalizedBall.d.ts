import type { CSSProperties } from 'react';

export interface CrystalizedBallProps {
  preset?: string;
  color?: string;
  theme?: 'dark' | 'light';
  size?: number;
  strands?: number;
  crackle?: number;
  flares?: number;
  glow?: number;
  sparks?: number;
  particleCount?: number;
  fill?: number;
  motion?: 'rise' | 'fall' | 'drift' | 'orbit';
  particleShape?: 'square' | 'round';
  depth?: number;
  sway?: number;
  twinkle?: number;
  haze?: number;
  speed?: number;
  dustSpeed?: number;
  interactive?: boolean;
  hoverStrength?: number;
  intro?: boolean;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
}

declare function CrystalizedBall(props: CrystalizedBallProps): JSX.Element;
export default CrystalizedBall;
