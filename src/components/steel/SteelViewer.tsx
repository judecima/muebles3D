'use client';

import * as React from 'react';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { SteelSceneManager } from '@/steel/SteelSceneManager';
import { SteelHouseConfig, SteelOpening } from '@/lib/steel/types';
import { useToast } from '@/hooks/use-toast';

interface SteelViewerProps {
  config: SteelHouseConfig;
  onOpeningDoubleClick?: (wallId: string, opening: SteelOpening) => void;
  onWalkModeLock?: (locked: boolean) => void;
}

export const SteelViewer = forwardRef(({ config, onOpeningDoubleClick, onWalkModeLock }: SteelViewerProps, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SteelSceneManager | null>(null);
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    enterWalkMode: () => {
      if (managerRef.current) {
        managerRef.current.enterWalkMode();
      }
    },
    setMovement: (direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down' | 'sprint', active: boolean) => {
      if (managerRef.current) {
        managerRef.current.setMovement(direction, active);
      }
    },
    updateJoystickMove: (x: number, y: number) => {
      if (managerRef.current) managerRef.current.updateJoystickMove(x, y);
    },
    updateJoystickLook: (x: number, y: number) => {
      if (managerRef.current) managerRef.current.updateJoystickLook(x, y);
    }
  }));

  useEffect(() => {
    if (containerRef.current && !managerRef.current) {
      managerRef.current = new SteelSceneManager(
        containerRef.current, 
        onOpeningDoubleClick,
        onWalkModeLock
      );

      // Configurar el manejador de errores de Pointer Lock
      managerRef.current.setPointerLockErrorHandler(() => {
        toast({
          title: "Modo Caminata Manual",
          description: "El navegador bloqueó el control del ratón. Navegue usando las teclas WASD o joysticks.",
          variant: "default",
        });
      });
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, [onOpeningDoubleClick, onWalkModeLock, toast]);

  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.buildHouse(config);
    }
  }, [config]);

  return <div ref={containerRef} className="w-full h-full touch-none bg-slate-50" />;
});

SteelViewer.displayName = 'SteelViewer';
