'use client';
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
  /** Array of health factor values, oldest first */
  data: number[];
  width?: number;
  height?: number;
  /** Liquidation threshold (default 1.0) */
  threshold?: number;
}

export function Sparkline({ data, width = 140, height = 46, threshold = 1.0 }: SparklineProps) {
  const { pathD, threshY, lastY, lastX, lastColor } = useMemo(() => {
    const min = Math.min(...data, threshold - 0.15) - 0.05;
    const max = Math.max(...data, threshold + 0.15) + 0.05;
    const range = max - min;

    const scaleX = (i: number) => (i / (data.length - 1)) * width;
    const scaleY = (v: number) => height - ((v - min) / range) * height;

    const pts = data.map((v, i) => [scaleX(i), scaleY(v)] as [number, number]);
    const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const ty = scaleY(threshold);
    const [lx, ly] = pts[pts.length - 1];
    const lv = data[data.length - 1];
    const lc = lv >= threshold ? '#b8f24e' : '#f2c9a0';

    return { pathD: d, threshY: ty, lastY: ly, lastX: lx, lastColor: lc };
  }, [data, width, height, threshold]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {/* Threshold dashed line */}
      <line
        x1={0} y1={threshY} x2={width} y2={threshY}
        stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="4 3"
      />
      {/* Threshold label */}
      <text x={width + 4} y={threshY + 4} fontSize={8} fill="rgba(255,255,255,0.35)" fontFamily="monospace">1.0</text>

      {/* Sparkline path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={lastColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 4px ${lastColor}60)` }}
      />

      {/* Last value dot */}
      <motion.circle
        cx={lastX} cy={lastY} r={4}
        fill={lastColor}
        stroke="#0f0f0f" strokeWidth={1.5}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.85, type: 'spring', stiffness: 320, damping: 20 }}
      />
    </svg>
  );
}
