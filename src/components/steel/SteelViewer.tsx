'use client';

import * as React from 'react';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { SteelSceneManager } from '@/steel/SteelSceneManager';
import { SteelHouseConfig, SteelOpening } from '@/lib/steel/types';
import { SteelJoystick } from './SteelJoystick';

interface SteelViewerProps {
  config: SteelHouseConfig;
  onOpeningDoubleClick?: (wallId: string, opening: SteelOpening) => void;
  onWalkModeLock?: (locked: boolean) => void;
}

export const SteelViewer = forwardRef(({ config, onOpeningDoubleClick, onWalkModeLock }: SteelViewerProps, ref) => {
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
  }, [onOpeningDoubleClick, onWalkModeLock]);

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
          
          <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none text-center">
            <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
              <p className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] mb-1">Controles de Inspección</p>
              <div className="flex gap-4 items-center">
                <span className="text-[9px] font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded">WASD: MOVER</span>
                <span className="text-[9px] font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded">MOUSE: GIRAR</span>
                <span className="text-[9px] font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded">SHIFT: CORRER</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

SteelViewer.displayName = 'SteelViewer';
