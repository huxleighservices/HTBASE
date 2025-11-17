
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

Your task is to generate a detailed training document for a fictional company that sells a relatively common product or service. This document will be used to train an AI to act as a potential customer (a "prospect").

The document should include:
1.  **Fictional Company & Product:** Invent a company name and describe a well-understood product or service. Focus on common industries like B2B Software (e.g., CRM, project management), professional services (e.g., marketing agency, financial consulting), or high-value equipment (e.g., commercial kitchen appliances, office furniture). Avoid overly niche or bizarre sci-fi products.
2.  **Product Details:** Briefly describe what the product does, its key features, and a realistic price point (e.g., $50/user/month for software, $10,000 project fee for consulting).
3.  **Prospect Persona:** Create a relatable character for the AI to play. Give them a name, a profession within a standard industry, a personality (e.g., skeptical, enthusiastic but busy, detail-oriented), and a specific business need or problem that the product might solve.
4.  **Scenario Context:** Set the scene. How did the salesperson get in touch with this prospect? (e.g., cold call, referral, trade show, etc.). What is the primary goal of this specific conversation?

The entire output should be a single block of text that can be pasted into a training data field. The goal is a realistic, grounded scenario.

Example Structure:
---
**PRODUCT STUDY GUIDE: [Fictional Company Name] - [Product/Service Name]**

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

Generate a new, unique scenario now. Do not repeat ideas from previous generations. Make it completely different from any prior output.`,
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
