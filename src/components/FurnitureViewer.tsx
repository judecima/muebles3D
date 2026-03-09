'use client';

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
        managerRef.current.animateDoors(true);
        break;
      case 'close-doors':
        managerRef.current.animateDoors(false);
        break;
      case 'open-drawers':
        managerRef.current.animateDrawers(true);
        break;
      case 'close-drawers':
        managerRef.current.animateDrawers(false);
        break;
      case 'explode':
        managerRef.current.explodeView(1);
        break;
      case 'reset':
        managerRef.current.explodeView(0);
        managerRef.current.animateDoors(false);
        managerRef.current.animateDrawers(false);
        break;
    }
  }, [action]);

  return <div ref={containerRef} className="w-full h-full" />;
}