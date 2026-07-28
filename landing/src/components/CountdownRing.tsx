'use client';
import React from 'react';
import { motion } from 'framer-motion';

const R    = 52;
const CIRC = 2 * Math.PI * R; // ≈ 326.7

function ringColor(pct: number): string {
  if (pct > 0.5) return '#b8f24e';   // lime — plenty of time
  if (pct > 0.25) return '#f5c84a';  // amber — getting close
  return '#f2c9a0';                   // peach — urgent
}

interface CountdownRingProps {
  /** Remaining seconds */
  seconds: number;
  /** Total window in seconds */
  total: number;
  /** Optional size override (default 128) */
  size?: number;
}

export function CountdownRing({ seconds, total, size = 128 }: CountdownRingProps) {
  const pct    = Math.max(0, Math.min(1, seconds / total));
  const offset = CIRC * (1 - pct);
  const color  = ringColor(pct);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      {/* SVG ring — rotated so progress starts at 12 o'clock */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 128 128"
        style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={64} cy={64} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={9}
        />
        {/* Progress arc */}
        <motion.circle
          cx={64} cy={64} r={R}
          fill="none"
          stroke={color}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset, stroke: color }}
          transition={{ duration: 0.85, ease: 'linear' }}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>

      {/* Center readout — NOT rotated */}
      <div style={{ textAlign: 'center', userSelect: 'none' }}>
        <motion.div
          key={Math.floor(pct * 4)} // re-animate color only on tier change
          animate={{ color }}
          transition={{ duration: 0.4 }}
          style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 700, lineHeight: 1 }}
        >
          {seconds}
        </motion.div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          secs
        </div>
      </div>
    </div>
  );
}
