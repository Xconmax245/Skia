'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const HEX = '0123456789abcdef';

function randomHex(len: number): string {
  return Array.from({ length: len }, () => HEX[Math.floor(Math.random() * HEX.length)]).join('');
}

/**
 * §17.2 / §17.3 — shared cipher-shuffle hook.
 *
 * When `active` is true, returns a rapidly cycling random hex string of `len` chars.
 * When `active` is false, returns `target` (the real value).
 * `intervalMs` defaults to 70ms — fast enough to look live, slow enough to read as intentional.
 */
export function useShuffleText(
  target: string,
  active: boolean,
  intervalMs = 70,
  minLen = 0
): string {
  const len = Math.max(target.length, minLen);
  // SSR safe deterministic placeholder (e.g., '0' for every alphanumeric char)
  const ssrSafeInitial = target.replace(/[a-zA-Z0-9]/g, '0').padEnd(len, '0');
  
  const [display, setDisplay] = useState<string>(ssrSafeInitial);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (active) {
      setDisplay(randomHex(len)); // trigger immediate random state on mount
      timerRef.current = setInterval(() => {
        setDisplay(randomHex(len));
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setDisplay(target);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, target, len, intervalMs, mounted]);

  // Before mount, match SSR exactly
  if (!mounted) {
    return active ? ssrSafeInitial : target;
  }

  return display;
}

/**
 * Progressive smooth cipher reveal hook.
 * Instead of all characters randomizing and instantly snapping all at once,
 * the string resolves character-by-character from left to right with a smooth ease-out curve.
 */
export function useSmoothCipherReveal(
  target: string,
  trigger: boolean = true,
  options?: {
    durationMs?: number;
    delayMs?: number;
    intervalMs?: number;
  }
) {
  const durationMs = options?.durationMs ?? 1100;
  const delayMs = options?.delayMs ?? 150;
  const intervalMs = options?.intervalMs ?? 35;

  const [display, setDisplay] = useState<string>(target);
  const [isResolved, setIsResolved] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !trigger) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;
    let startTime: number | null = null;

    const startAnimation = () => {
      startTime = Date.now();
      
      intervalId = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime!;
        const rawProgress = Math.min(1, elapsed / durationMs);

        // Smooth cubic ease-out curve for natural, soft deceleration
        const easedProgress = 1 - Math.pow(1 - rawProgress, 3.5);
        const resolvedCount = Math.floor(easedProgress * target.length);

        if (rawProgress >= 1) {
          setDisplay(target);
          setIsResolved(true);
          clearInterval(intervalId);
          return;
        }

        const chars = target.split('');
        const scrambled = chars
          .map((ch, idx) => {
            if (ch === ' ' || ch === '.' || ch === '-') return ch;
            if (idx < resolvedCount) return ch;
            return HEX[Math.floor(Math.random() * HEX.length)];
          })
          .join('');

        setDisplay(scrambled);
      }, intervalMs);
    };

    timeoutId = setTimeout(startAnimation, delayMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [target, trigger, durationMs, delayMs, mounted]);

  if (!mounted) {
    return { display: target, isResolved: true };
  }

  return { display, isResolved };
}

/**
 * §17.3 — hover-triggered shuffle for sealed values in order book rows.
 * Returns handlers + display string; real value shown while not hovering.
 */
export function useHoverShuffle(sealed: string) {
  const [hovering, setHovering] = useState(false);
  const display = useShuffleText(sealed, hovering, 55, 16);

  const onMouseEnter = useCallback(() => setHovering(true), []);
  const onMouseLeave = useCallback(() => setHovering(false), []);

  return { hovering, display, onMouseEnter, onMouseLeave };
}

/**
 * §17.7 — clipboard with "Copied · still sealed" toast.
 * Returns `{ copy, copied }` — `copied` is true for 2s after copying.
 */
export function useCopyToast(text: string) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { copy, copied };
}
