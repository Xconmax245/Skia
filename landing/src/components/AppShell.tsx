'use client';
import React from 'react';
import { CommandPalette } from './CommandPalette';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      {/* Ambient gradient orbs — pointer-events none, fixed */}
      <div className="app-ambient" aria-hidden="true" />
      <CommandPalette />
      <main className="app-main">{children}</main>
    </div>
  );
}
