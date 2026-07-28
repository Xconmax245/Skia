'use client';
import { useEffect } from 'react';
import AOS from 'aos';

export function AOSInit() {
  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
    });
  }, []);
  return null;
}
