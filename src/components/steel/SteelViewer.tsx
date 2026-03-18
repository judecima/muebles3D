'use client';

import * as React from 'react';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { SteelSceneManager } from '@/steel/SteelSceneManager';
import { SteelHouseConfig, SteelOpening, InternalWall } from '@/lib/steel/types';
import { SteelJoystick } from './SteelJoystick';

interface SteelViewerProps {
  config: SteelHouseConfig;
  structuralResult?: any;
  onOpeningDoubleClick?: (wallId: string, opening: SteelOpening, isInternal?: boolean) => void;
  onInternalWallDoubleClick?: (iw: InternalWall, x: number) => void;
  onWallDoubleClick?: (wallId: string, x: number, side: 'exterior' | 'interior') => void;
  onFloorDoubleClick?: (x: number, z: number) => void;
  onWalkModeLock?: (locked: boolean) => void;
}

export const SteelViewer = forwardRef(({ 
  config, 
  structuralResult,
  onOpeningDoubleClick, 
  onInternalWallDoubleClick,
  onWallDoubleClick, 
  onFloorDoubleClick,
  onWalkModeLock 
}: SteelViewerProps, ref) => {
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
    /* exitWalkMode: () => {
      if (managerRef.current) {
        managerRef.current.exitWalkMode();
        setIsWalkMode(false);
      }
    } */
  }));

  const prevConfigRef = useRef<SteelHouseConfig | null>(null);

  useEffect(() => {
    if (!managerRef.current || !structuralResult) return;

    if (prevConfigRef.current !== config) {
      managerRef.current.buildHouse(config, structuralResult);
      prevConfigRef.current = config;
    }
  }, [config, structuralResult]);

  useEffect(() => {
    if (containerRef.current && !managerRef.current) {
      managerRef.current = new SteelSceneManager(containerRef.current);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
  
    manager.onOpeningDoubleClick = onOpeningDoubleClick || null;
    manager.onWallDoubleClick = onWallDoubleClick || null;
    manager.onInternalWallDoubleClick = onInternalWallDoubleClick || null;
    manager.onFloorDoubleClick = onFloorDoubleClick || null;
  
    manager.onWalkModeLock = (locked) => {
      setIsWalkMode(locked);
      onWalkModeLock?.(locked);
    };
  }, [
    onOpeningDoubleClick,
    onWallDoubleClick,
    onInternalWallDoubleClick,
    onFloorDoubleClick,
    onWalkModeLock
  ]);

  useEffect(() => {
    if (!managerRef.current || !structuralResult) return;
  
    managerRef.current.buildHouse(config, structuralResult);
  
  }, [structuralResult]);

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
