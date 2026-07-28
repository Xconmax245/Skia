'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HEX = '0123456789abcdef';
const rndHex = (len: number) =>
  Array.from({ length: len }, () => HEX[Math.floor(Math.random() * HEX.length)]).join('');

interface CipherSkeletonProps {
  /** When true, shows the real content (crossfades in) */
  loaded?: boolean;
  /** Number of shimmer rows to display while loading */
  rows?: number;
  /** Column widths (%) per row, defaults to [100, 75, 55] */
  widths?: number[];
  children?: React.ReactNode;
}

/**
 * §17.2 — CipherSkeleton: loading state that shows rapidly cycling hex glyphs
 * instead of the generic gray shimmer bar. Visually communicates "decrypting"
 * rather than "loading". Crossfades to real content once `loaded` is true.
 */
export function CipherSkeleton({
  loaded = false,
  rows = 3,
  widths = [100, 72, 52],
  children,
}: CipherSkeletonProps) {
  const [glyphs, setGlyphs] = useState<string[]>(() =>
    Array.from({ length: rows }, (_, i) => rndHex(Math.round(((widths[i] ?? 60) / 100) * 40)))
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loaded) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setGlyphs(
        Array.from({ length: rows }, (_, i) =>
          rndHex(Math.round(((widths[i] ?? 60) / 100) * 40))
        )
      );
    }, 80);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loaded, rows, widths]);

  return (
    <AnimatePresence mode="wait">
      {!loaded ? (
        <motion.div
          key="cipher-skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {glyphs.map((g, i) => (
            <div
              key={i}
              className="cipher-text"
              style={{
                width: `${widths[i] ?? 60}%`,
                opacity: i === 0 ? 0.7 : i === 1 ? 0.4 : 0.22,
              }}
            >
              {g}
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key="cipher-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
