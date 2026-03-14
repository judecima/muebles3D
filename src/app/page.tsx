'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Box, 
  LayoutGrid, 
  Home as HomeIcon, 
  Settings2, 
  ArrowRight,
  ChevronRight,
  Cpu,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function LandingPage() {
  const tools = [
    {
      title: "Diseñador de Mobiliario",
      description: "Generación técnica de muebles paramétricos con despiece automático y herrajes.",
      icon: Box,
      href: "/furniture",
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Steel Framing Engine",
      description: "Ingeniería AISI completa para estructuras de acero galvanizado con cómputo métrico.",
      icon: HomeIcon,
      href: "/steel-framing",
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    {
      title: "Optimizador de Corte",
      description: "Motor industrial de nesting para maximizar el aprovechamiento de tableros MDF/OSB.",
      icon: LayoutGrid,
      href: "/cut-optimizer",
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter text-slate-900">JADSI <span className="text-primary font-light">INDUSTRIAL</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/furniture" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">Mobiliario</Link>
          <Link href="/steel-framing" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">Steel Framing</Link>
          <Link href="/cut-optimizer" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">Optimización</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-24">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full border border-blue-100 mb-4 animate-bounce">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Nueva Plataforma JADSI v16.5</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter leading-[0.9]">
            Ingeniería de <br /> <span className="text-primary">Siguiente Generación</span>
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-lg font-medium leading-relaxed">
            Potenciamos la industria de la construcción y el diseño con motores de cálculo avanzado, visualización 3D y optimización de recursos en tiempo real.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tools.map((tool, idx) => (
            <Link key={idx} href={tool.href} className="group">
              <Card className="h-full border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 overflow-hidden relative">
                <div className={`h-2 w-full ${tool.bg.replace('50', '500')}`} />
                <CardContent className="p-8 space-y-6">
                  <div className={`${tool.bg} ${tool.color} w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    <tool.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter group-hover:text-primary transition-colors">{tool.title}</h3>
                    <p className="text-slate-500 text-sm mt-3 leading-relaxed font-medium">
                      {tool.description}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center text-xs font-black uppercase tracking-widest text-primary gap-2">
                    Iniciar Herramienta <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Features Row */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 border-t pt-16">
          <div className="flex gap-4">
            <div className="bg-slate-900 p-2 rounded-lg shrink-0 h-10 w-10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-900">Seguridad Industrial</h4>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">Cálculos basados en normativas internacionales AISI y estándares de fabricación Masisa.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-900 p-2 rounded-lg shrink-0 h-10 w-10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-900">Control Total</h4>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">Gestión completa de materiales, desperdicios y logística en una sola interfaz web.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-900 p-2 rounded-lg shrink-0 h-10 w-10 flex items-center justify-center">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-900">Exportación Técnica</h4>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">Generación instantánea de fichas PDF con planos de montaje y listas de corte.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 opacity-50 grayscale hover:opacity-100 transition-all">
            <Cpu className="w-5 h-5" />
            <span className="text-lg font-black tracking-tighter">JADSI</span>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} JADSI INDUSTRIAL TECHNOLOGY — TODOS LOS DERECHOS RESERVADOS
          </p>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest">Soporte</Button>
            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest">Legal</Button>
          </div>
        </div>
      </footer>
    </div>
  );
}