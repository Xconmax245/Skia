'use client';
import React from 'react';
import { ArrowRight } from 'lucide-react';

type Variant = 'lime' | 'ghost' | 'cream' | 'outline-ink';

interface CTAButtonProps {
  variant?: Variant;
  label: string;
  href?: string;
  icon?: boolean;
  onClick?: () => void;
  className?: string;
}

const classMap: Record<Variant, string> = {
  lime:        'btn btn-lime',
  ghost:       'btn btn-ghost',
  cream:       'btn btn-cream',
  'outline-ink': 'btn btn-outline-ink',
};

export function CTAButton({ variant = 'lime', label, href = '#signup', icon = false, onClick, className = '' }: CTAButtonProps) {
  return (
    <a href={href} onClick={onClick} className={`${classMap[variant]} ${className}`}>
      {label}
      {icon && <ArrowRight size={15} strokeWidth={2.5} />}
    </a>
  );
}
