'use client';
import React from 'react';

/** Wave divider — fills into the NEXT section's color */
interface WaveDividerProps {
  fill: string; // CSS color value
  flip?: boolean; // flip horizontally for variety
}

export function WaveDivider({ fill, flip = false }: WaveDividerProps) {
  return (
    <div className="wave-divider" style={flip ? { transform: 'scaleX(-1)' } : {}}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0,80 L0,40 Q180,0 360,40 Q540,80 720,40 Q900,0 1080,40 Q1260,80 1440,40 L1440,80 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
