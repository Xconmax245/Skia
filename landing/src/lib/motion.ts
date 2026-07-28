import type { Variants, Transition } from 'framer-motion';

/* ─── Shared easing ─── */
export const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const easeSmooth: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ─── Variants ─── */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.65, ease } },
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

export const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

/* ─── Transitions ─── */
export const springPop: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 24,
};

export const springSmooth: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 28,
};

/* ─── Timing constants ─── */
export const timing = {
  fast: 0.18,
  standard: 0.28,
  slow: 0.6,
} as const;
