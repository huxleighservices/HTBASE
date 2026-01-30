
'use server';
/**
 * @fileOverview An AI assistant for providing insights on Accounts Receivable collections.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const EnrichedARCustomerSchema = z.object({
    id: z.string(),
    customerName: z.string(),
    buildCompleteDate: z.any(),
    initialBalance: z.number(),
    totalPaid: z.number(),
    totalOwed: z.number(),
    currentBalance: z.number(),
    progress: z.number(),
    daysSinceBuild: z.number().nullable(),
});

const ArCollectionsAssistantInputSchema = z.object({
  customers: z.array(EnrichedARCustomerSchema),
});

const ArCollectionsAssistantOutputSchema = z.object({
    keyInsight: z.string().describe("A single, most important insight from the data. For example, '3 high-value accounts are severely overdue.'"),
    collectionHealthScore: z.number().min(0).max(100).describe("A score from 0-100 representing the overall health of the collections process, where 100 is perfect."),
    priorityActions: z.array(z.object({
        customerName: z.string(),
        reason: z.string().describe("Why this customer is a priority. e.g., '90 days overdue, high balance.'"),
        suggestedAction: z.string().describe("A specific next step. e.g., 'Send a final notice email.'"),
    })).describe("A short list of the top 2-3 priority customers to focus on now."),
});

export async function getArCollectionsInsights(input: z.infer<typeof ArCollectionsAssistantInputSchema>): Promise<z.infer<typeof ArCollectionsAssistantOutputSchema>> {
  return arCollectionsAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'arCollectionsAssistantPrompt',
  input: { schema: ArCollectionsAssistantInputSchema },
  output: { schema: ArCollectionsAssistantOutputSchema },
  prompt: `You are an expert AI Accounts Receivable and collections analyst. Your goal is to analyze the provided list of customer accounts and provide actionable insights to help the collections team prioritize their efforts.

Today's Date: ${new Date().toLocaleDateString()}

Here is the list of customer accounts:
---
{{#each customers}}
- Customer: {{customerName}}
  - Days Since Build Completion: {{daysSinceBuild}}
  - Initial Balance: \${{initialBalance}}
  - Current Balance Due: \${{currentBalance}}
  - Total Amount Paid: \${{totalPaid}}
  - Total Amount Owed (incl. penalties): \${{totalOwed}}
  - Payment Progress: {{progress}}%
{{/each}}
---

Based on this data, your tasks are:
1.  **Generate a Key Insight:** Identify the single most critical piece of information. This could be about the number of overdue accounts, the total outstanding balance, or a trend you notice.
2.  **Calculate a Collection Health Score:** Provide a score from 0 to 100 that represents the overall health of the collections. Consider factors like the percentage of accounts that are overdue, the age of the debt, and the percentage of total debt collected. A score of 100 means all accounts are paid on time. A score of 0 means no money has been collected and all accounts are severely overdue.
3.  **Identify Priority Actions:** List the top 2-3 customers that require immediate attention. For each one, provide the customer's name, a brief reason why they are a priority (e.g., "Large balance, 90+ days overdue"), and a concrete suggested next action (e.g., "Initiate a final demand letter," "Call to confirm payment plan," "Verify contact information").

Provide your analysis in the structured output format.`,
});

const arCollectionsAssistantFlow = ai.defineFlow(
  {
    name: 'arCollectionsAssistantFlow',
    inputSchema: ArCollectionsAssistantInputSchema,
    outputSchema: ArCollectionsAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
