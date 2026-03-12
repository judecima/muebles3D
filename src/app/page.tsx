'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Box, 
  Home, 
  ArrowRight, 
  Settings2,
  Layers,
  LayoutGrid,
  ShieldCheck
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-body">
      <header className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
            <Settings2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">JADSI</h1>
        </div>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Industrial Technology & Design</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
        <Link href="/muebles" className="group">
          <Card className="h-full border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white group-hover:-translate-y-2">
            <div className="h-48 bg-slate-900 relative overflow-hidden flex items-center justify-center">
              <Box className="w-24 h-24 text-primary/40 absolute -right-4 -bottom-4 rotate-12 group-hover:scale-110 transition-transform duration-500" />
              <Box className="w-20 h-20 text-white relative z-10" />
            </div>
            <CardContent className="p-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase mb-2">Diseño de Mobiliario</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Generador paramétrico de despiece industrial. Optimización de corte y visualización 3D en tiempo real.
              </p>
              <Button className="w-full h-12 bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-widest gap-2">
                Entrar al Módulo <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/steel-framing" className="group">
          <Card className="h-full border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white group-hover:-translate-y-2">
            <div className="h-48 bg-blue-600 relative overflow-hidden flex items-center justify-center">
              <Layers className="w-24 h-24 text-white/20 absolute -right-4 -bottom-4 rotate-12 group-hover:scale-110 transition-transform duration-500" />
              <Home className="w-20 h-20 text-white relative z-10" />
            </div>
            <CardContent className="p-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase mb-2">Steel Framing Engine</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Ingeniería estructural AISI. Cálculo de paneles, cargas y cómputo métrico detallado para obra.
              </p>
              <Button className="w-full h-12 bg-slate-900 hover:bg-black font-black uppercase text-xs tracking-widest gap-2">
                Entrar al Módulo <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <footer className="mt-16 flex items-center gap-8 text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Algoritmos Protegidos JADSI v29.0</span>
        </div>
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Motor Industrial v15.2</span>
        </div>
      </footer>
    </div>
  );
}