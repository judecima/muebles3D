import React, { useEffect, useRef } from 'react';
import { SceneManager } from '@/three/SceneManager';
import { Part } from '@/lib/types';

interface FurnitureViewerProps {
  parts: Part[];
  action: string;
}

export function FurnitureViewer({ parts, action }: FurnitureViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<SceneManager | null>(null);

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
      managerRef.current.buildFurniture(parts);
    }
  }, [parts]);

  useEffect(() => {
    if (!managerRef.current) return;

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
        managerRef.current.setDoors(false);
        managerRef.current.setDrawers(false);
        break;
    }
  }, [action]);

  return <div ref={containerRef} className="w-full h-full touch-none" />;
}
