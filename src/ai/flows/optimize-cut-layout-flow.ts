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
  panelWidth: z.number().positive().describe('Width after trim (e.g. 2580 for a 2600 panel)'),
  panelHeight: z.number().positive().describe('Height after trim (e.g. 1810 for a 1830 panel)'),
  kerf: z.number().describe('Thickness of the saw blade, default 4.5mm'),
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
  prompt: `You are an expert MDF cutting optimizer. Use the GUILLOTINE ALGORITHM (Best Area Fit) to arrange parts.

Rules:
1. TABLERO: {{{panelWidth}}} x {{{panelHeight}}} mm.
2. KERF: {{{kerf}}} mm must be subtracted after each cut (except for the last piece in a strip).
3. GRAIN DIRECTION:
   - 'vertical': Width is aligned with the long side (panelWidth). Cannot rotate.
   - 'horizontal': Height is aligned with the long side. Cannot rotate.
   - 'libre': Can be rotated 90 degrees if it improves efficiency.
4. OPTIMIZATION: Aim for >90% efficiency. If area used < 85%, rethink the arrangement.
5. NO OVERLAPS. All cuts must be edge-to-edge (Guillotine).

Parts to place:
{{{json cutlist}}}

Return a JSON with the optimized arrangement for all panels needed.`,
});

const optimizeCutLayoutFlow = ai.defineFlow(
  {
    name: 'optimizeCutLayoutFlow',
    inputSchema: OptimizeCutLayoutInputSchema,
    outputSchema: OptimizeCutLayoutOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);