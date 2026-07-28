'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CopyToastProps {
  visible: boolean;
}

export function CopyToast({ visible }: CopyToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="copy-toast"
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.18 }}
        >
          Copied · still sealed
        </motion.div>
      )}
    </AnimatePresence>
  );
}
