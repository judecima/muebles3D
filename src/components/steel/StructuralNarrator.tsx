import React from 'react';

interface NarratorProps {
  currentStep: string;
  data: {
    pileCapacity?: number;
    maxDeflection?: number;
    totalWeight?: number;
  };
}

export const StructuralNarrator = ({ currentStep, data }: NarratorProps) => {
  const getSubtitles = () => {
    switch (currentStep) {
      case 'start':
        return "Iniciando secuencia de auditoría estructural completa (LOD 400)...";
      case 'foundation':
        return `Análisis de transferencia de cargas a cimientos. Capacidad nominal por pilotón: ${data.pileCapacity || 2500}kg. Registro: ESTABLE.`;
      case 'walls_pb':
        return "Montaje de Planta Baja. Inspección de In-line Framing (alineación vertical de montantes).";
      case 'xray':
        return "Activando Modo Auditoría (Rayos X). Visualizando vectores de carga y concentraciones de estrés en nudos.";
      case 'web_crippling':
        return "Verificando pandeo de alma (Web Crippling) en apoyos de vigas y dinteles pesados.";
      case 'exploded':
        return "Desglose técnico para montaje y fabricación. Identificación de paneles estructurales.";
      case 'blueprint':
        return "Fase técnica: Modo Blueprint. Generando documentación de obra y listados de corte final.";
      case 'end':
        return "Auditoría finalizada. Estabilización estructural garantizada. Documentación lista para descarga.";
      default:
        return "Procesando simulación estructural...";
    }
  };

  if (!currentStep) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-xl border-l-4 border-cyan-500 p-4 rounded-r-2xl shadow-2xl transition-all duration-700 transform scale-100 opacity-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
          <p className="text-cyan-400 text-[10px] uppercase font-black tracking-widest leading-none">
            Ingeniería en Tiempo Real / Auditoría Steel Frame
          </p>
        </div>
        <p className="text-white text-base font-medium leading-tight italic font-serif">
          "{getSubtitles()}"
        </p>
      </div>
    </div>
  );
};
