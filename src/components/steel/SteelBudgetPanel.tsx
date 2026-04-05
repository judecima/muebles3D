import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SteelHouseConfig, MaterialEstimate } from '@/lib/steel/types';
import { DollarSign, Package, TrendingUp, X } from 'lucide-react';

interface SteelBudgetPanelProps {
  config: SteelHouseConfig;
  materials: MaterialEstimate;
  onClose: () => void;
}

export function SteelBudgetPanel({ config, materials, onClose }: SteelBudgetPanelProps) {
  const calculateTotal = () => {
    let total = 0;
    materials.items.forEach(item => {
      let price = 0;
      if (item.name.includes('PGC 100')) price = config.prices.steelKg * 1.5; // Estimado por metro/barra
      else if (item.name.includes('Hormigón')) price = config.prices.concreteM3;
      else if (item.name.includes('OSB')) price = config.prices.osbSheet;
      else if (item.name.includes('Yeso')) price = config.prices.gypsumSheet;
      else if (item.name.includes('T1')) price = config.prices.screwT1;
      
      total += item.quantity * price;
    });
    return total + (config.width * config.length / 1000000) * config.prices.laborM2;
  };

  const total = calculateTotal();

  return (
    <Card className="w-80 shadow-2xl border-slate-200 animate-in slide-in-from-right duration-300">
      <CardHeader className="bg-slate-900 text-white p-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Presupuesto Estimado
        </CardTitle>
        <button onClick={onClose} className="hover:bg-slate-800 p-1 rounded-full transition-colors">
          <X className="w-4 h-4" />
        </button>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto max-h-[70vh]">
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Total Estimado</span>
            <span className="text-2xl font-black text-emerald-900">${total.toLocaleString('es-AR')}</span>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-600 opacity-20" />
        </div>

        <div className="p-2 space-y-1">
          {['perfileria', 'paneles', 'fijaciones', 'aislacion'].map(cat => (
            <div key={cat} className="space-y-1">
              <div className="px-2 py-1 bg-slate-100 rounded text-[9px] font-black uppercase text-slate-500 mt-2 flex items-center gap-2">
                <Package className="w-3 h-3" />
                {cat}
              </div>
              {materials.items
                .filter(item => item.category === cat)
                .map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded transition-colors group">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-slate-700 line-clamp-1">{item.name}</span>
                      <span className="text-[9px] text-slate-400">{item.description}</span>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="text-[10px] font-black text-slate-900">{item.quantity} {item.unit}</span>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
            <span>Peso Total Acero</span>
            <span className="text-slate-900">{materials.totalSteelWeightKg} KG</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
