'use client';

import React, { useState, useRef } from 'react';

interface SteelJoystickProps {
  label: string;
  onMove: (vector: { x: number; y: number }) => void;
  className?: string;
}

export function SteelJoystick({ label, onMove, className }: SteelJoystickProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  const handleTouch = (e: React.TouchEvent | React.MouseEvent) => {
    if (!baseRef.current) return;
    
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = rect.width / 2;
    
    const limitedDistance = Math.min(distance, radius);
    const angle = Math.atan2(dy, dx);
    
    const x = Math.cos(angle) * limitedDistance;
    const y = Math.sin(angle) * limitedDistance;
    
    setKnobPos({ x, y });
    // Normalizamos el vector de -1 a 1
    onMove({ x: x / radius, y: -y / radius }); 
  };

  const handleEnd = () => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em] drop-shadow-md">{label}</span>
      <div 
        ref={baseRef}
        className="relative w-32 h-32 rounded-full bg-slate-900/20 backdrop-blur-xl border-4 border-white/20 touch-none shadow-2xl"
        onTouchStart={() => setIsDragging(true)}
        onTouchMove={handleTouch}
        onTouchEnd={handleEnd}
        onMouseDown={() => setIsDragging(true)}
        onMouseMove={(e) => isDragging && handleTouch(e)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        {/* Guía Visual Central */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1 h-1 rounded-full bg-white/10" />
        </div>
        
        {/* Knob (Mando) */}
        <div 
          className="absolute w-14 h-14 rounded-full bg-white/30 shadow-2xl border-2 border-white/50 transition-transform duration-75 ease-out flex items-center justify-center"
          style={{ 
            left: '50%', 
            top: '50%', 
            transform: `translate(calc(-50% + ${knobPos.x}px), calc(-50% + ${knobPos.y}px))`
          }}
        >
          <div className="w-6 h-6 rounded-full bg-white/20 border border-white/40" />
        </div>
      </div>
    </div>
  );
}
