'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { ERPPerson } from '@/types/erp';
import type { Department } from '@/lib/departments';

const ERPAssistantInputSchema = z.object({
  question: z.string(),
  firmName: z.string(),
  people: z.string(),
  enabledDepartments: z.string(),
});

const ERPAssistantOutputSchema = z.object({
  answer: z.string(),
});

const erpAssistantPrompt = ai.definePrompt({
  name: 'erpAssistantPrompt',
  input:  { schema: ERPAssistantInputSchema },
  output: { schema: ERPAssistantOutputSchema },
  prompt: `You are Aldous, an AI ERP analyst for {{firmName}}.
You have access to the following people and department data:

PEOPLE DATA:
{{people}}

ACTIVE DEPARTMENTS:
{{enabledDepartments}}

Answer the user's question using only the data above. Be concise, insightful, and actionable.
If asked for a summary, highlight patterns and flag any at-risk or pending items.
Do not invent data that is not in the provided records.

DUPLICATE DETECTION RULES (apply when the question is about duplicates):
- Flag records with the same or very similar full name (e.g. "John Smith" and "John A. Smith")
- Flag records sharing the same email address or phone number
- Records that appear in multiple widgetLinks are intentional multi-links, NOT duplicates
- List suspected duplicate pairs by name and explain which fields match
- Recommend which record to keep — prefer the one with more department assignments or widget links
- Be specific and list actual names

QUESTION: {{question}}`,
});

const erpAssistantFlow = ai.defineFlow(
  {
    name: 'erpAssistantFlow',
    inputSchema: ERPAssistantInputSchema,
    outputSchema: ERPAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await erpAssistantPrompt(input);
    return output!;
  },
);

export async function queryERPAssistant(input: {
  question: string;
  firmName: string;
  people: ERPPerson[];
  enabledDepartments: Department[];
}): Promise<{ answer: string }> {
  const result = await erpAssistantFlow({
    question: input.question,
    firmName: input.firmName,
    people: JSON.stringify(input.people, null, 2),
    enabledDepartments: JSON.stringify(
      input.enabledDepartments.map((d) => ({ id: d.id, label: d.label })),
    ),
  });
  return { answer: result.answer };
}
