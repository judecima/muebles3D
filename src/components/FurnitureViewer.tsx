'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { SceneManager } from '@/three/SceneManager';
import { Part, FurnitureColor } from '@/lib/types';

interface FurnitureViewerProps {
  parts: Part[];
  action: string;
  color: FurnitureColor;
}

export const FurnitureViewer = forwardRef(({ parts, action, color }: FurnitureViewerProps, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);

  useImperativeHandle(ref, () => ({
    getScreenshot: () => {
      return managerRef.current ? managerRef.current.getScreenshot() : '';
    }
  }));

  useEffect(() => {
    if (containerRef.current && !managerRef.current) {
      managerRef.current = new SceneManager(containerRef.current);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.buildFurniture(parts, color);
    }
  }, [parts, color]);

  useEffect(() => {
    if (!managerRef.current || !action) return;

    switch (action) {
      case 'open-doors':
        managerRef.current.setDoors(true);
        break;
      case 'close-doors':
        managerRef.current.setDoors(false);
        break;
      case 'open-drawers':
        managerRef.current.setDrawers(true);
        break;
      case 'close-drawers':
        managerRef.current.setDrawers(false);
        break;
      case 'explode':
        managerRef.current.explodeView(1);
        break;
      case 'reset':
        managerRef.current.resetAssembly();
        break;
    }
  }, [action]);

  return <div ref={containerRef} className="w-full h-full touch-none" />;
});

FurnitureViewer.displayName = 'FurnitureViewer';