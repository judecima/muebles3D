'use client';

import * as React from 'react';
import { useEffect, useRef, forwardRef, useImperativeHandle, useState, memo } from 'react';
import { SteelSceneManager } from '@/steel/SteelSceneManager';
import { SteelHouseConfig, SteelOpening, InternalWall } from '@/lib/steel/types';
import { SteelJoystick } from './SteelJoystick';
import { exportWallPDF } from '@/steel/export/PlanPDFGenerator';
import { SteelBudgetPanel } from './SteelBudgetPanel';
import { calculateSteelMaterials } from '@/server/steel/materialCalculator';
import { startPresentation } from '@/steel/PresentationEngine';
import { StructuralNarrator } from '@/components/steel/StructuralNarrator';

interface SteelViewerProps {
  config: SteelHouseConfig;
  structuralResult?: any;
  onConfigChange?: (config: SteelHouseConfig) => void;
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
  onWalkModeLock,
  onConfigChange
}: SteelViewerProps, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SteelSceneManager | null>(null);
  const [isWalkMode, setIsWalkMode] = React.useState(false);
  const [presentationStep, setPresentationStep] = React.useState<string | null>(null);

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
    }, */
    getScreenshot: () => {
      return managerRef.current?.getScreenshot();
    }
  }));

  const prevConfigRef = useRef<SteelHouseConfig | null>(null);

  useEffect(() => {
    if (!managerRef.current || !structuralResult) return;

    if (prevConfigRef.current !== config) {
      managerRef.current.setShowDiagrams(config.layers.structuralDiagrams);
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
      <button
  onClick={() => {
    if (!config.walls.length || !structuralResult) return;

    // 👉 ejemplo: primer muro
    const wall = config.walls[0];
    const processed = structuralResult.processedWalls?.find(
      (w: any) => w.id === wall.id
    );

    if (processed) {
      exportWallPDF(wall, processed.panels, config);
    }
  }}
  className="absolute top-4 left-4 z-50 bg-black text-white px-4 py-2 rounded"
>
  Exportar PDF
</button>
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

      {config.layers.budget && (
        <div className="absolute top-4 right-4 z-50">
          <SteelBudgetPanel 
            config={config} 
            materials={calculateSteelMaterials(config)} 
            onClose={() => {}} 
          />
        </div>
      )}

      {presentationStep && (
        <StructuralNarrator 
          currentStep={presentationStep}            data={{ 
            pileCapacity: 2500, 
            maxDeflection: 1.2, 
            totalWeight: calculateSteelMaterials(config).items.reduce((acc: number, m: any) => acc + (m.weightKg || 0), 0)
          }} 
        />
      )}

      {/* Botón de Lanzamiento de Presentación (Solo si no está activa) */}
      {!presentationStep && (
        <button 
          onClick={() => {
            if (managerRef.current && onConfigChange) {
                startPresentation(managerRef.current, config, setPresentationStep, onConfigChange);
            }
          }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full shadow-2xl font-bold uppercase text-xs tracking-widest transition-all hover:scale-105 active:scale-95 z-50"
        >
          🎬 Iniciar Presentación Estructural
        </button>
      )}
    </div>
  );
});

SteelViewer.displayName = 'SteelViewer';
