
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SimulationDifficulty } from '@/types/trainer';
import { pineWiltWindowsGuide } from '@/ai/docs/pine-wilt-windows';
import type { ProspectingSimulationOutput } from '@/types/trainer';

const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const SimulationInputSchema = z.object({
  difficulty: z.nativeEnum(SimulationDifficulty),
  conversationHistory: z.array(ConversationMessageSchema),
  trainingData: z.string().optional(),
});

const SimulationFeedbackSchema = z.object({
  overallAssessment: z.string().describe('A brief, overall assessment of the user\'s performance.'),
  positivePoints: z.array(z.string()).describe('A list of specific things the user did well.'),
  areasForImprovement: z.array(z.string()).describe('A list of specific areas where the user can improve.'),
});

export async function runQualificationSimulation(input: z.infer<typeof SimulationInputSchema>): Promise<ProspectingSimulationOutput> {
  const { difficulty, conversationHistory, trainingData } = input;
  const userMessageCount = conversationHistory.filter(m => m.role === 'user').length;
  const isComplete = userMessageCount >= 5;

  const productInfo = trainingData || pineWiltWindowsGuide;

  const systemPrompt = `You are an AI sales training assistant. You are playing the role of a potential customer for the product described below who has shown some initial interest. The user is a salesperson in training trying to qualify you as a lead.

  Here is the product information. You should use this to inform your responses, objections, and questions:
  ${productInfo}

  Your persona is based on the difficulty level:
  - Easy: You are a good fit. You own your home, have a budget, and are the primary decision-maker. You're concerned about your high energy bills.
  - Medium: You are a bit of a fit. You might be renting, have a tight budget, or need to consult with a partner. You're curious but not fully committed.
  - Hard: You are a poor fit. You are not the decision-maker, have no budget, or live in a condo with an HOA that has strict rules about window replacement. You are just browsing.

  Engage in a conversation with the user. After 5 user messages, the simulation will end.
  `;
  
  if (isComplete) {
    const feedbackResponse = await ai.generate({
      prompt: `The following is a transcript of a sales qualification simulation. The user is the salesperson and the assistant is the prospect.
      Please provide feedback on the user's performance based on the transcript, focusing on their ability to ask qualifying questions (budget, authority, need, timeline).

      Transcript:
      ${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

      Based on the conversation, provide an overall assessment, a few positive points, and a few areas for improvement for the salesperson's qualification skills.
      `,
      model: 'googleai/gemini-2.5-flash',
      output: {
        schema: SimulationFeedbackSchema,
      },
    });

    const feedback = feedbackResponse.output;
    return {
      isComplete: true,
      response: null,
      feedback,
    };
  } else {
    const response = await ai.generate({
      prompt: `Conversation History:
      ${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}
      user: ${conversationHistory[conversationHistory.length - 1].content}
      
      Based on the persona for difficulty '${difficulty}', generate the prospect's response.`,
      model: 'googleai/gemini-2.5-flash',
      system: systemPrompt,
      output: {
        schema: z.object({ response: z.string() })
      }
    });
    
    return {
      isComplete: false,
      response: response.output!.response,
      feedback: null,
    };
  }
}

    