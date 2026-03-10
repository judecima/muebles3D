'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { SteelSceneManager } from '@/steel/SteelSceneManager';
import { SteelHouseConfig, SteelOpening } from '@/lib/steel/types';

interface SteelViewerProps {
  config: SteelHouseConfig;
  onOpeningDoubleClick?: (wallId: string, opening: SteelOpening) => void;
  onWalkModeLock?: (locked: boolean) => void;
}

export const SteelViewer = forwardRef(({ config, onOpeningDoubleClick, onWalkModeLock }: SteelViewerProps, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SteelSceneManager | null>(null);

  useImperativeHandle(ref, () => ({
    enterWalkMode: () => {
      if (managerRef.current) {
        managerRef.current.enterWalkMode();
      }
    },
    setMovement: (direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down', active: boolean) => {
      if (managerRef.current) {
        managerRef.current.setMovement(direction, active);
      }
    }
  }));

  useEffect(() => {
    if (containerRef.current && !managerRef.current) {
      managerRef.current = new SteelSceneManager(
        containerRef.current, 
        onOpeningDoubleClick,
        onWalkModeLock
      );
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, [onOpeningDoubleClick, onWalkModeLock]);

  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.buildHouse(config);
    }
  }, [config]);

  return <div ref={containerRef} className="w-full h-full touch-none bg-slate-50" />;
});

SteelViewer.displayName = 'SteelViewer';
