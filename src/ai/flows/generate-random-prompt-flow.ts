'use server';
/**
 * @fileOverview A flow to generate a random, fictitious sales training prompt.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRandomPromptOutputSchema = z.object({
  prompt: z.string().describe('The generated sales training scenario text.'),
});

export type GenerateRandomPromptOutput = z.infer<typeof GenerateRandomPromptOutputSchema>;

export async function generateRandomPrompt(): Promise<GenerateRandomPromptOutput> {
  return generateRandomPromptFlow();
}

const prompt = ai.definePrompt({
  name: 'generateRandomPrompt',
  output: {schema: GenerateRandomPromptOutputSchema},
  prompt: `You are a creative writer specializing in creating scenarios for sales training simulations.

Your task is to generate a detailed and imaginative training document for a fictional product. This document will be used to train an AI to act as a potential customer (a "prospect").

The document should include:
1.  **Fictional Product:** Invent a unique product or service. It could be anything from a high-tech gadget to a bizarre consulting service. (e.g., "Anti-Gravity Boots", "Professional Dream Interpretation", "Personalized Weather Control Devices").
2.  **Product Details:** Briefly describe what the product does, its key features, and its price point (make it substantial, e.g., $5,000 - $50,000).
3.  **Prospect Persona:** Create a character for the AI to play. Give them a name, a profession, a personality (e.g., skeptical, enthusiastic but busy, confused, detail-oriented), and a specific need or problem that the product might solve.
4.  **Scenario Context:** Set the scene. How did the salesperson get in touch with this prospect? (e.g., cold call, referral, trade show, etc.). What is the primary goal of this specific conversation?

The entire output should be a single block of text that can be pasted into a training data field. Make it creative, engaging, and a little bit random to keep the training interesting.

Example Structure:
---
**PRODUCT STUDY GUIDE: [Fictional Product Name]**

**Product Description:**
[Brief description of the product and its purpose.]

**Key Features:**
- [Feature 1]
- [Feature 2]
- [Feature 3]

**Pricing:**
[Price or price range.]

**PROSPECT PERSONA FOR SIMULATION:**
- **Name:** [Prospect's Name]
- **Profession:** [Prospect's Job]
- **Personality:** [Description of their attitude and communication style.]
- **Needs/Pain Points:** [What problem are they trying to solve?]

**SCENARIO CONTEXT:**
[Description of how this sales call is happening and what the salesperson's immediate goal is.]
---

Generate a new, unique scenario now.`,
});

const generateRandomPromptFlow = ai.defineFlow(
  {
    name: 'generateRandomPromptFlow',
    outputSchema: GenerateRandomPromptOutputSchema,
  },
  async () => {
    const {output} = await prompt();
    return output!;
  }
);
