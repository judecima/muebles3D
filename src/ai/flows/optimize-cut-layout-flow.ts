'use server';
/**
 * @fileOverview An AI agent that optimizes the cutting layout of furniture parts on standard MDF panels.
 *
 * - optimizeCutLayout - A function that handles the cut layout optimization process.
 * - OptimizeCutLayoutInput - The input type for the optimizeCutLayout function.
 * - OptimizeCutLayoutOutput - The return type for the optimizeCutLayout function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OptimizeCutLayoutInputSchema = z.object({
  cutlist: z
    .array(
      z.object({
        name: z.string().describe('Name of the furniture part (e.g., "lateral derecho").'),
        width: z.number().positive().describe('Width of the part in millimeters.'),
        height: z.number().positive().describe('Height of the part in millimeters.'),
        quantity: z.number().int().positive().describe('Number of identical parts required.'),
      })
    )
    .min(1)
    .describe('List of furniture parts to be cut.'),
  panelWidth: z.number().positive().describe('Standard width of the MDF panel in millimeters.'),
  panelHeight: z.number().positive().describe('Standard height of the MDF panel in millimeters.'),
});
export type OptimizeCutLayoutInput = z.infer<typeof OptimizeCutLayoutInputSchema>;

const OptimizeCutLayoutOutputSchema = z.object({
  optimizedLayout: z
    .array(
      z.object({
        panelNumber: z.number().int().positive().describe('Unique identifier for the MDF panel.'),
        parts: z
          .array(
            z.object({
              name: z.string().describe('Name of the part.'),
              x: z
                .number()
                .int()
                .min(0)
                .describe('X-coordinate of the top-left corner of the part on the panel.'),
              y: z
                .number()
                .int()
                .min(0)
                .describe('Y-coordinate of the top-left corner of the part on the panel.'),
              width: z.number().int().positive().describe('Width of the part.'),
              height: z.number().int().positive().describe('Height of the part.'),
              rotated: z.boolean().describe('True if the part was rotated by 90 degrees to fit.'),
            })
          )
          .describe('List of parts placed on this panel.'),
        wasteArea: z.number().describe('Area of unused space on this panel in square millimeters.'),
      })
    )
    .describe('The optimized arrangement of parts on standard MDF panels.'),
  totalWasteArea: z.number().describe('Total waste area across all panels in square millimeters.'),
  summary: z
    .string()
    .describe('A brief summary of the optimization results, e.g., "Used 3 panels with a total waste of X mm²."'),
});
export type OptimizeCutLayoutOutput = z.infer<typeof OptimizeCutLayoutOutputSchema>;

export async function optimizeCutLayout(input: OptimizeCutLayoutInput): Promise<OptimizeCutLayoutOutput> {
  return optimizeCutLayoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeCutLayoutPrompt',
  input: { schema: OptimizeCutLayoutInputSchema },
  output: { schema: OptimizeCutLayoutOutputSchema },
  prompt: `You are an expert in cutting pattern optimization for MDF furniture manufacturing. Your task is to arrange a given list of furniture parts onto standard MDF panels to minimize material waste.

Each part has a 'name', 'width', 'height', and 'quantity'. Each standard MDF panel has a fixed 'panelWidth' and 'panelHeight'.

Rules for placement:
1. Parts cannot overlap.
2. Parts can be rotated 90 degrees to fit, if beneficial. Indicate if a part is rotated with the 'rotated' flag.
3. All coordinates (x, y, width, height) must be integers, representing millimeters.
4. The origin (0,0) for each panel is the top-left corner.
5. Minimize the total waste area across all panels used.
6. Use as few panels as possible.

Input Cutlist:
{{{json cutlist}}}

Panel Dimensions:
Width: {{{panelWidth}}} mm
Height: {{{panelHeight}}} mm

Please provide the optimized layout as a JSON object that strictly adheres to the OptimizeCutLayoutOutputSchema provided.
Calculate 'wasteArea' for each panel and 'totalWasteArea' for all panels used. Provide a 'summary' of the optimization.`,
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
