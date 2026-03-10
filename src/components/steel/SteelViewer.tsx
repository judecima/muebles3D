'use client';

import React, { useEffect, useRef, forwardRef } from 'react';
import { SteelSceneManager } from '@/steel/SteelSceneManager';
import { SteelHouseConfig, SteelOpening } from '@/lib/steel/types';

interface SteelViewerProps {
  config: SteelHouseConfig;
  onOpeningDoubleClick?: (wallId: string, opening: SteelOpening) => void;
}

export const SteelViewer = forwardRef(({ config, onOpeningDoubleClick }: SteelViewerProps, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SteelSceneManager | null>(null);

  useEffect(() => {
    if (containerRef.current && !managerRef.current) {
      managerRef.current = new SteelSceneManager(containerRef.current, onOpeningDoubleClick);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, [onOpeningDoubleClick]);

  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.buildHouse(config);
    }
  }, [config]);

  return <div ref={containerRef} className="w-full h-full touch-none bg-slate-50" />;
});

SteelViewer.displayName = 'SteelViewer';
