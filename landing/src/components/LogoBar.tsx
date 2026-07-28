'use client';
import React from 'react';
import Image from 'next/image';

interface LogoBarItemProps {
  iconSrc: string;
  label?: string;
  alt: string;
}

function LogoBarItem({ iconSrc, label, alt }: LogoBarItemProps) {
  return (
    <div className="logo-item" style={{ display: 'flex', alignItems: 'center', gap: label ? '8px' : '0px' }}>
      <div style={{ width: '24px', height: '24px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src={iconSrc} alt={alt} fill style={{ objectFit: 'contain' }} unoptimized />
      </div>
      {label && (
        <span style={{ 
          fontSize: '0.8rem', 
          fontWeight: 600, 
          letterSpacing: '0.06em', 
          textTransform: 'uppercase',
          fontFamily: 'var(--font-sans, Arial)' 
        }}>
          {label}
        </span>
      )}
    </div>
  );
}

export function LogoBar() {
  return (
    <div className="logo-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '40px' }}>
      <LogoBarItem iconSrc="/logos/aave.svg" alt="Aave" label="Aave" />
      <LogoBarItem iconSrc="/logos/iexec.svg" alt="iExec Nox" label="iExec Nox" />
      <LogoBarItem iconSrc="/logos/ethereum.svg" alt="Ethereum Sepolia" label="Ethereum Sepolia" />
    </div>
  );
}
