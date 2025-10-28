
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SimulationDifficulty, type ProspectingSimulationOutput } from '@/types/trainer';
import { pineWiltWindowsGuide } from '@/ai/docs/pine-wilt-windows';

const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const SimulationInputSchema = z.object({
  difficulty: z.nativeEnum(SimulationDifficulty),
  conversationHistory: z.array(ConversationMessageSchema),
});

const SimulationFeedbackSchema = z.object({
  overallAssessment: z.string().describe('A brief, overall assessment of the user\'s performance.'),
  positivePoints: z.array(z.string()).describe('A list of specific things the user did well.'),
  areasForImprovement: z.array(z.string()).describe('A list of specific areas where the user can improve.'),
});

export async function runClosingSimulation(input: z.infer<typeof SimulationInputSchema>): Promise<ProspectingSimulationOutput> {
  const { difficulty, conversationHistory } = input;
  const userMessageCount = conversationHistory.filter(m => m.role === 'user').length;
  const isComplete = userMessageCount >= 5;

  const systemPrompt = `You are an AI sales training assistant. You are playing the role of a prospect at the closing stage for a deal on Pine Wilt Windows. The user is a salesperson in training trying to close the deal.

  Here is the product information for Pine Wilt Windows. You should use this to inform your responses, objections, and questions:
  ${pineWiltWindowsGuide}

  Your persona is based on the difficulty level:
  - Easy: You are ready to sign. You are enthusiastic and just need a clear prompt to move forward.
  - Medium: You are hesitant and need a final nudge. You might ask for a small discount, a better warranty, or bring up one last "what if" concern.
  - Hard: You have cold feet. You are suddenly risk-averse and might say things like "I need to think about it more," or "Maybe we should wait until next season."

  Engage in a conversation with the user. After 5 user messages, the simulation will end.
  `;
  
  if (isComplete) {
    const feedbackResponse = await ai.generate({
      prompt: `The following is a transcript of a sales closing simulation. The user is the salesperson and the assistant is the prospect.
      Please provide feedback on the user's performance based on the transcript, focusing on their ability to create urgency, ask for the sale, and handle last-minute objections.

      Transcript:
      ${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

      Based on the conversation, provide an overall assessment, a few positive points, and a few areas for improvement for the salesperson's closing skills.
      `,
      model: 'googleai/gemini-2.5-flash',
      output: {
        schema: SimulationFeedbackSchema,
      },
    });

    const feedback = feedbackResponse.output();
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
      response: response.output()!.response,
      feedback: null,
    };
  }
}
