
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

const SimulationResponseSchema = z.object({
  response: z.string().nullable().describe('The AI\'s response to the user. Null if the simulation is complete.'),
  feedback: SimulationFeedbackSchema.nullable().describe('Feedback on the user\'s performance. Null if the simulation is not yet complete.'),
  isComplete: z.boolean().describe('Whether the simulation is complete.'),
});

export async function runProspectingSimulation(input: z.infer<typeof SimulationInputSchema>): Promise<ProspectingSimulationOutput> {
  const { difficulty, conversationHistory } = input;
  const userMessageCount = conversationHistory.filter(m => m.role === 'user').length;
  const isComplete = userMessageCount >= 5;

  const systemPrompt = `You are an AI sales training assistant. You are playing the role of a potential customer for Pine Wilt Windows. The user is a salesperson in training. Your goal is to simulate a realistic prospecting conversation.

  Here is the product information for Pine Wilt Windows. You should use this to inform your responses, objections, and questions:
  ${pineWiltWindowsGuide}

  Your persona is based on the difficulty level:
  - Easy: You are a friendly lead who has some interest in new windows. You are open to hearing more.
  - Medium: You are busy and a bit skeptical. You've heard about energy-efficient windows but aren't sure if it's worth the hassle.
  - Hard: You are dismissive and not interested in talking. You believe your current windows are fine and see this as an unwanted sales call.

  Engage in a conversation with the user. After 5 user messages, the simulation will end.
  `;

  if (isComplete) {
    // Generate feedback
    const feedbackResponse = await ai.generate({
      prompt: `The following is a transcript of a sales prospecting simulation. The user is the salesperson and the assistant is the prospect.
      Please provide feedback on the user's performance based on the transcript.

      Transcript:
      ${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

      Based on the conversation, provide an overall assessment, a few positive points, and a few areas for improvement for the salesperson.
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
    // Generate AI response
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
