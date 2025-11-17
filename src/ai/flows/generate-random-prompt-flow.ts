
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
  prompt: `You are a creative writer who creates simple and clear scenarios for sales training.

Your task is to generate a training document for a fictional company. The product or service should be from a common, everyday industry that an 8th grader would easily understand.

**RULES:**
- **Broad Industries:** Choose from a wide variety of sectors like consumer packaged goods (e.g., snacks, drinks), manufacturing (e.g., furniture, parts), SaaS (simple software), retail (e.g., clothing, electronics), or services (e.g., landscaping, cleaning).
- **Simplicity is Key:** The company, product, and prospect's problem must be straightforward and easy to grasp. Avoid complex jargon or niche B2B tools.
- **Unique Ideas:** Ensure each generated scenario is completely new and different from any previous one. Do not repeat ideas.

The document should include:
1.  **Fictional Company & Product:** Invent a simple company name and describe a very common product or service.
2.  **Product Details:** Briefly describe what it does, 1-2 key features, and a realistic price.
3.  **Prospect Persona:** Create a relatable character. Give them a name, a simple job or role, a clear personality (e.g., skeptical, busy, friendly), and a simple problem the product can solve.
4.  **Scenario Context:** Briefly explain how the salesperson is contacting the prospect (e.g., cold call, store visit, referral).

**Example Structure:**
---
**PRODUCT STUDY GUIDE: [Fictional Company Name] - [Product/Service Name]**

**Product Description:**
[Simple description of the product and its purpose.]

**Key Features:**
- [Feature 1]
- [Feature 2]

**Pricing:**
[Simple price, e.g., "$15 per box" or "$200 for a one-time service".]

**PROSPECT PERSONA FOR SIMULATION:**
- **Name:** [Prospect's Name]
- **Role:** [Prospect's simple role, e.g., "Office Manager" or "Small Business Owner".]
- **Personality:** [Description of their attitude.]
- **Needs/Pain Points:** [What simple problem are they trying to solve?]

**SCENARIO CONTEXT:**
[Description of how this sales call is happening.]
---

Generate a new, unique, and simple scenario now. Make it completely different from any prior output.`,
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
