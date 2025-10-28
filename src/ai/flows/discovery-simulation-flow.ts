
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

export async function runDiscoverySimulation(input: z.infer<typeof SimulationInputSchema>): Promise<ProspectingSimulationOutput> {
  const { difficulty, conversationHistory, trainingData } = input;
  const userMessageCount = conversationHistory.filter(m => m.role === 'user').length;
  const isComplete = userMessageCount >= 5;

  const productInfo = trainingData || pineWiltWindowsGuide;

  const systemPrompt = `You are an AI sales training assistant. You are playing the role of a qualified lead for the product described below. The user is a salesperson in training trying to do a discovery call to understand your needs.

  Here is the product information. You should use this to inform your responses, objections, and questions:
  ${productInfo}

  Your persona is based on the difficulty level:
  - Easy: You are cooperative and open. You know you have a problem (e.g., drafty windows, high energy bills, outside noise) and are happy to discuss it.
  - Medium: You are vague and unsure. You think you might need new windows but can't articulate the specific problem well. You might say things like "they're just old".
  - Hard: You are guarded and resistant. You are skeptical of the salesperson and don't want to share too much information. You need to be convinced to open up.

  Engage in a conversation with the user. After 5 user messages, the simulation will end.
  `;
  
  if (isComplete) {
    const feedbackResponse = await ai.generate({
      prompt: `The following is a transcript of a sales discovery simulation. The user is the salesperson and the assistant is the prospect.
      Please provide feedback on the user's performance based on the transcript, focusing on their ability to ask open-ended questions and uncover the prospect's pain points.

      Transcript:
      ${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

      Based on the conversation, provide an overall assessment, a few positive points, and a few areas for improvement for the salesperson's discovery skills.
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

    