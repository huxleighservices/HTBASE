'use server';
/**
 * @fileOverview Summarizes the user's training progress based on completed sessions and performance data.
 *
 * - summarizeTrainingProgress - A function that handles the summarization of training progress.
 * - SummarizeTrainingProgressInput - The input type for the summarizeTrainingProgress function.
 * - SummarizeTrainingProgressOutput - The return type for the summarizeTrainingProgress function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTrainingProgressInputSchema = z.object({
  completedSessions: z
    .number()
    .describe('The number of training sessions the user has completed.'),
  performanceData: z
    .string()
    .describe(
      'A description of the user performance data, including strengths and weaknesses.'
    ),
});
export type SummarizeTrainingProgressInput = z.infer<
  typeof SummarizeTrainingProgressInputSchema
>;

const SummarizeTrainingProgressOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A summary of the user training progress, including overall development and areas for improvement.'
    ),
  progress: z
    .string()
    .describe('A short, one-sentence summary of what you have generated.'),
});
export type SummarizeTrainingProgressOutput = z.infer<
  typeof SummarizeTrainingProgressOutputSchema
>;

export async function summarizeTrainingProgress(
  input: SummarizeTrainingProgressInput
): Promise<SummarizeTrainingProgressOutput> {
  return summarizeTrainingProgressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTrainingProgressPrompt',
  input: {schema: SummarizeTrainingProgressInputSchema},
  output: {schema: SummarizeTrainingProgressOutputSchema},
  prompt: `You are an AI training assistant. You will summarize the user's training progress based on the number of completed sessions and performance data. Provide a summary of the user's overall development and areas for improvement.\n\nCompleted Sessions: {{{completedSessions}}}\nPerformance Data: {{{performanceData}}}`,
});

const summarizeTrainingProgressFlow = ai.defineFlow(
  {
    name: 'summarizeTrainingProgressFlow',
    inputSchema: SummarizeTrainingProgressInputSchema,
    outputSchema: SummarizeTrainingProgressOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      ...output!,
      progress: 'The AI has summarized the user training progress and identified areas for improvement.',
    };
  }
);
