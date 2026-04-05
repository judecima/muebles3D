import React from 'react';
import { Html } from '@react-three/drei';

interface AlertProps {
  status: 'FAIL' | 'WARN';
  message: string;
  position: [number, number, number];
  data: {
    calculated: number;
    limit: number;
    unit: string;
  };
}

export const StructuralAlert = ({ status, message, position, data }: AlertProps) => {
  const isFail = status === 'FAIL';
  const colorClass = isFail ? 'bg-red-600' : 'bg-amber-500';
  
  return (
    <Html position={position} center distanceFactor={2000}>
      <div className={`${colorClass} p-2 rounded-lg shadow-2xl border border-white/30 backdrop-blur-sm transition-all hover:scale-110 cursor-default min-w-[120px] pointer-events-auto z-50`}>
        <div className="flex items-center gap-2 mb-1 border-b border-white/20 pb-1">
          <span className="text-sm">{isFail ? '🚫' : '⚠️'}</span>
          <span className="font-black text-[9px] text-white uppercase tracking-tighter">ALERTA {status}</span>
        </div>
        
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-white leading-tight">{message}</p>
          <div className="flex justify-between items-center text-[8px] font-black text-white/90 bg-black/20 p-1 rounded">
            <span>CALC: {data.calculated.toFixed(2)}{data.unit}</span>
            <span className="mx-1">/</span>
            <span>LIM: {data.limit.toFixed(2)}{data.unit}</span>
          </div>
        </div>
        
        {/* Triángulo indicador inferior */}
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 ${colorClass} rotate-45 border-r border-b border-white/30`}></div>
      </div>
    </Html>
  );
};
