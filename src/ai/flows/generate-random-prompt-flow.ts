
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
  prompt: `You are an expert creative writer tasked with generating a new, unique, and simple sales training scenario.

**Your Thought Process (CRITICAL):**
1.  **Choose an Industry:** Randomly pick an industry from this specific list: **Healthcare, consumer packaged goods, home services, SAAS, business consulting, pet services, food and drink, entertainment, audio/video, travel, phone and wifi, windows and doors.** Do not select the same industry you chose in the previous generation.
2.  **Choose a Sub-Industry:** Narrow it down (e.g., if Home Services, choose 'Lawn Care' or 'House Painting').
3.  **Find a Niche:** Get specific (e.g., if Lawn Care, choose 'Organic, pet-safe fertilization services').
4.  **Create the Scenario:** Build the training document based on that niche.

**RULES:**
*   **NO REPEATS:** You MUST NOT generate a scenario that is similar to any you have created in the last 12 generations. The industry, sub-industry, and niche MUST be different each time.
*   **8th Grade Level:** The company, product, and prospect's problem must be straightforward and easy to grasp. Avoid complex jargon.

**Output Structure:**
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

Generate a new, unique, and simple scenario now. Make it completely different from any prior output by following your thought process.`,
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
