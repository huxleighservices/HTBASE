
'use server';
/**
 * @fileOverview An AI flow to answer questions based on SOP documents.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SopBotInputSchema = z.object({
  question: z.string().describe('The user\'s question about the SOPs.'),
  sopContent: z.string().describe('The full text content of all SOP documents.'),
});

const SopBotOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the user\'s question.'),
});

export async function answerSopQuestion(input: z.infer<typeof SopBotInputSchema>): Promise<z.infer<typeof SopBotOutputSchema>> {
  return sopBotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sopBotPrompt',
  input: { schema: SopBotInputSchema },
  output: { schema: SopBotOutputSchema },
  prompt: `You are an expert assistant, the "SOP Bot". Your role is to answer questions based ONLY on the provided Standard Operating Procedure (SOP) documents. Answer the question like a helpful human colleague.

If the answer is not found in the provided documents, state that you do not have information on that topic. Do not make up information.

**SOP Documents:**
---
{{{sopContent}}}
---

**User's Question:**
"{{{question}}}"

Based on the documents, what is the answer?`,
});

const sopBotFlow = ai.defineFlow(
  {
    name: 'sopBotFlow',
    inputSchema: SopBotInputSchema,
    outputSchema: SopBotOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
