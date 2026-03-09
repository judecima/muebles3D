'use server';
/**
 * @fileOverview An AI agent that optimizes the cutting layout of furniture parts on standard MDF panels using Guillotine Algorithm.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OptimizeCutLayoutInputSchema = z.object({
  cutlist: z
    .array(
      z.object({
        name: z.string().describe('Name of the part.'),
        width: z.number().positive().describe('Width (Largo de veta si aplica)'),
        height: z.number().positive().describe('Height'),
        quantity: z.number().int().positive(),
        grainDirection: z.enum(['vertical', 'horizontal', 'libre']),
      })
    ),
  panelWidth: z.number().positive().describe('Width after trim'),
  panelHeight: z.number().positive().describe('Height after trim'),
  kerf: z.number().describe('Thickness of the saw blade'),
});
export type OptimizeCutLayoutInput = z.infer<typeof OptimizeCutLayoutInputSchema>;

const OptimizeCutLayoutOutputSchema = z.object({
  optimizedLayout: z.array(
    z.object({
      panelNumber: z.number().int(),
      parts: z.array(
        z.object({
          name: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          rotated: z.boolean(),
        })
      ),
      efficiency: z.number().describe('Percentage of used space on this panel'),
    })
  ),
  totalPanels: z.number(),
  totalEfficiency: z.number(),
  summary: z.string(),
});
export type OptimizeCutLayoutOutput = z.infer<typeof OptimizeCutLayoutOutputSchema>;

export async function optimizeCutLayout(input: OptimizeCutLayoutInput): Promise<OptimizeCutLayoutOutput> {
  return optimizeCutLayoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeCutLayoutPrompt',
  input: { schema: OptimizeCutLayoutInputSchema },
  output: { schema: OptimizeCutLayoutOutputSchema },
  prompt: `You are an expert MDF cutting optimizer for "Red Arquimax". 
Use the GUILLOTINE ALGORITHM (Best Area Fit) to arrange these parts.

TABLERO ÚTIL: {{{panelWidth}}} x {{{panelHeight}}} mm.
KERF: {{{kerf}}} mm.

Reglas:
1. Las piezas con 'vertical' u 'horizontal' NO se rotan.
2. Las piezas 'libre' se pueden rotar para mejorar eficiencia.
3. Maximiza el uso del tablero (>90%).
4. Los cortes deben ser de lado a lado (Guillotine).

Listado:
{{{json cutlist}}}

Devuelve el JSON con la disposición optimizada.`,
});

const optimizeCutLayoutFlow = ai.defineFlow(
  {
    name: 'optimizeCutLayoutFlow',
    inputSchema: OptimizeCutLayoutInputSchema,
    outputSchema: OptimizeCutLayoutOutputSchema,
  },
  async input => {
    try {
      const { output } = await prompt(input);
      if (!output) throw new Error("No output from AI");
      return output;
    } catch (error) {
      console.error("AI Optimization Flow Error:", error);
      throw error;
    }
  }
);
