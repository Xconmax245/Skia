'use client';
import React from 'react';
import { Lock } from 'lucide-react';

type EyebrowVariant = 'ink' | 'lime' | 'peach';

/** Legacy single-pill tag — kept for section headers */
interface EyebrowTagProps {
  text: string;
  variant?: EyebrowVariant;
}
export function EyebrowTag({ text, variant = 'ink' }: EyebrowTagProps) {
  return (
    <div className={`eyebrow eyebrow-${variant}`}>
      <Lock size={10} strokeWidth={2.5} />
      {text}
    </div>
  );
}

/**
 * Per-word eyebrow chips — §9.3 spec:
 * ✦ [CONFIDENTIAL] [CREDIT] [INFRASTRUCTURE]
 * Each word is a separately-bordered pill.
 */
interface EyebrowWordPillsProps {
  words: string[];
  /** Shows the ✦ star glyph before the first chip */
  showStar?: boolean;
}
export function EyebrowWordPills({ words, showStar = true }: EyebrowWordPillsProps) {
  return (
    <div className="eyebrow-word-row">
      {showStar && <span className="eyebrow-star" aria-hidden="true">✦</span>}
      {words.map((word, i) => (
        <span key={i} className="eyebrow-chip">{word}</span>
      ))}
    </div>
  );
}
