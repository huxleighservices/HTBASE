'use server';

/**
 * @fileOverview Generates an initial training plan based on user-provided goals.
 *
 * - generateInitialTrainingPlan - A function that generates the initial training plan.
 * - GenerateInitialTrainingPlanInput - The input type for the generateInitialTrainingPlan function.
 * - GenerateInitialTrainingPlanOutput - The return type for the generateInitialTrainingPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInitialTrainingPlanInputSchema = z.object({
  trainingGoalDescription: z
    .string()
    .describe('A brief description of the user\u2019s training goals.'),
});

export type GenerateInitialTrainingPlanInput = z.infer<
  typeof GenerateInitialTrainingPlanInputSchema
>;

const GenerateInitialTrainingPlanOutputSchema = z.object({
  trainingPlan: z
    .string()
    .describe('The generated initial training plan based on the user goals.'),
});

export type GenerateInitialTrainingPlanOutput = z.infer<
  typeof GenerateInitialTrainingPlanOutputSchema
>;

export async function generateInitialTrainingPlan(
  input: GenerateInitialTrainingPlanInput
): Promise<GenerateInitialTrainingPlanOutput> {
  return generateInitialTrainingPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInitialTrainingPlanPrompt',
  input: {schema: GenerateInitialTrainingPlanInputSchema},
  output: {schema: GenerateInitialTrainingPlanOutputSchema},
  prompt: `You are an expert AI personal trainer. You will generate an initial training plan based on the user's training goals.

User's Training Goals: {{{trainingGoalDescription}}}

Initial Training Plan:`,
});

const generateInitialTrainingPlanFlow = ai.defineFlow(
  {
    name: 'generateInitialTrainingPlanFlow',
    inputSchema: GenerateInitialTrainingPlanInputSchema,
    outputSchema: GenerateInitialTrainingPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
