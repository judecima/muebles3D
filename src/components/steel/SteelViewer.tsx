'use client';

import * as React from 'react';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { SteelSceneManager } from '@/steel/SteelSceneManager';
import { SteelHouseConfig, SteelOpening } from '@/lib/steel/types';
import { SteelJoystick } from './SteelJoystick';

interface SteelViewerProps {
  config: SteelHouseConfig;
  onOpeningDoubleClick?: (wallId: string, opening: SteelOpening) => void;
  onWallDoubleClick?: (wallId: string, x: number, side: 'exterior' | 'interior') => void;
  onWalkModeLock?: (locked: boolean) => void;
}

export const SteelViewer = forwardRef(({ config, onOpeningDoubleClick, onWallDoubleClick, onWalkModeLock }: SteelViewerProps, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SteelSceneManager | null>(null);
  const [isWalkMode, setIsWalkMode] = React.useState(false);

  useImperativeHandle(ref, () => ({
    enterWalkMode: () => {
      if (managerRef.current) {
        managerRef.current.enterWalkMode();
        setIsWalkMode(true);
      }
    },
    exitWalkMode: () => {
      if (managerRef.current) {
        managerRef.current.exitWalkMode();
        setIsWalkMode(false);
      }
    }
  }));

  useEffect(() => {
    if (containerRef.current && !managerRef.current) {
      managerRef.current = new SteelSceneManager(
        containerRef.current, 
        onOpeningDoubleClick,
        onWallDoubleClick,
        (locked) => {
          setIsWalkMode(locked);
          if (onWalkModeLock) onWalkModeLock(locked);
        }
      );
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, [onOpeningDoubleClick, onWallDoubleClick, onWalkModeLock]);

  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.buildHouse(config);
    }
  }, [config]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full touch-none bg-slate-50" />
      
      {isWalkMode && (
        <>
          <div className="absolute bottom-8 left-8 z-50">
            <SteelJoystick label="MOVIMIENTO" onMove={(v) => managerRef.current?.updateJoystickMove(v.x, v.y)} />
          </div>
          <div className="absolute bottom-8 right-8 z-50">
            <SteelJoystick label="CÁMARA" onMove={(v) => managerRef.current?.updateJoystickLook(v.x, v.y)} />
          </div>
        </>
      )}
    </div>
  );
});

SteelViewer.displayName = 'SteelViewer';
