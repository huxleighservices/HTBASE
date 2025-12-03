
'use server';
/**
 * @fileOverview An AI agent for running a voice call sales simulation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { CallSimulationInput, SimulationOutput, CallPersona } from '@/types/trainer';
import { generateSpeechFlow } from './text-to-speech-flow';
import { pineWiltWindowsGuide } from '../docs/pine-wilt-windows';

const USER_TURN_LIMIT = 5;

const CallPersonaSchema = z.object({
    gender: z.enum(['Male', 'Female']),
    attitude: z.enum(['Cold', 'Warm', 'Ready to Buy']),
    qualification: z.enum(['Good Fit', 'Bad Fit', 'Unsure']),
});

const CallConversationMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
});

const CallSimulationFlowInputSchema = z.object({
  persona: CallPersonaSchema,
  conversationHistory: z.array(CallConversationMessageSchema),
  trainingData: z.string().optional(),
});


const CallSimulationInternalInputSchema = z.object({
  persona: CallPersonaSchema,
  conversationHistory: z.array(CallConversationMessageSchema),
  isFinalTurn: z.boolean(),
  trainingData: z.string().optional(),
});

const CallSimulationOutputSchema = z.object({
    response: z.string().optional().describe("The AI's verbal response as the prospect."),
    audioUrl: z.string().optional().describe("The data URI of the generated speech for the response."),
    feedback: z.object({
        overallAssessment: z.string().describe("A general summary of the user's performance on the call."),
        positivePoints: z.array(z.string()).describe("A list of effective techniques the user employed."),
        areasForImprovement: z.array(z.string()).describe("A list of specific suggestions for improvement."),
    }).optional(),
    isComplete: z.boolean(),
});

const prompt = ai.definePrompt({
  name: 'callSimulationPrompt',
  input: { schema: CallSimulationInternalInputSchema },
  // Output schema is slightly different from flow's output, as audioUrl is added later
  output: { schema: CallSimulationOutputSchema.omit({ audioUrl: true }) },
  prompt: `You are an advanced AI role-playing and training assistant. You are simulating a voice call.

SIMULATION CONTEXT:
The user is a sales representative for the product described below. They are on a call with you, a potential client. The user's goal is to effectively navigate the sales conversation based on your persona.

PRODUCT INFORMATION:
{{{trainingData}}}

YOUR PERSONA:
-   Attitude: {{{persona.attitude}}}
-   Qualification: {{{persona.qualification}}}
-   Gender: {{{persona.gender}}} (This should subtly influence your language and tone, but do not state it.)

CONVERSATION HISTORY (so far):
{{#each conversationHistory}}
-   {{role}}: {{content}}
{{/each}}

YOUR TASK:
{{#if isFinalTurn}}
    This is the final turn. The user has used all their speaking prompts. Enter FEEDBACK MODE.
    -   Stop role-playing as the prospect.
    -   Act as an expert sales coach.
    -   Analyze the ENTIRE conversation history. Assess the user's performance based on their tone, strategy, and ability to handle your persona. Did they ask good questions? Did they build rapport? Did they handle objections well?
    -   Provide a detailed, constructive performance review based on the provided PRODUCT INFORMATION.
    -   Populate the 'feedback' object with 'overallAssessment', 'positivePoints', and 'areasForImprovement'.
    -   Set 'isComplete' to true.
    -   DO NOT generate a 'response' field.
{{else}}
    This is a conversational turn. Enter SIMULATION MODE.
    -   Respond verbally to the user's last statement, staying perfectly in character based on your persona and the provided PRODUCT INFORMATION.
    -   **Ready to Buy/Good Fit**: Be enthusiastic and ready to proceed. Ask closing questions like "This sounds great, what are the next steps?"
    -   **Warm/Unsure**: Be open and interested, but with some clarifying questions. "Okay, I'm listening. How does the pricing work?" or "Can you explain the difference between X and Y?"
    -   **Cold/Bad Fit**: Be dismissive, short, and try to end the call. "I'm not interested, thanks." or "Now's not a good time."
    -   Your response should be something you would naturally say in a phone call. Keep it concise (1-3 sentences).
    -   Generate ONLY the 'response' field.
    -   'isComplete' should be false.
{{/if}}
`,
});

const callSimulationFlow = ai.defineFlow(
  {
    name: 'callSimulationFlow',
    inputSchema: CallSimulationFlowInputSchema,
    outputSchema: CallSimulationOutputSchema,
  },
  async (input) => {
    const isFinalTurn = input.conversationHistory.filter(m => m.role === 'user').length >= USER_TURN_LIMIT;

    const { output } = await prompt({
        ...input,
        trainingData: input.trainingData || pineWiltWindowsGuide,
        isFinalTurn,
    });
    
    if (output?.response) {
      const speechResult = await generateSpeechFlow({
        text: output.response,
        gender: input.persona.gender,
      });
      return { ...output, audioUrl: speechResult.audioUrl };
    }

    return output!;
  }
);

export async function runCallSimulation(input: CallSimulationInput): Promise<SimulationOutput> {
  // Map the input from the component to what the flow expects
  const flowInput: z.infer<typeof CallSimulationFlowInputSchema> = {
    ...input,
    conversationHistory: input.conversationHistory.map(m => ({role: m.role, content: m.text}))
  };
  return callSimulationFlow(flowInput);
}
