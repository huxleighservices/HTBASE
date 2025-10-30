
'use server';
/**
 * @fileOverview A Genkit flow for transcribing audio to text using Gemini.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AudioToTextInputSchema = z.string().describe(
  "An audio file encoded as a data URI. Expected format: 'data:audio/webm;base64,<encoded_data>'."
);

const AudioToTextOutputSchema = z.object({
  text: z.string().describe('The transcribed text from the audio.'),
});

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: AudioToTextInputSchema,
    outputSchema: AudioToTextOutputSchema,
  },
  async (audioDataUri) => {
    const result = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: [
        { text: 'Transcribe the following audio recording:' },
        { media: { url: audioDataUri } },
      ],
    });
    
    return { text: result.text };
  }
);

export async function transcribeAudio(audioDataUri: string): Promise<{text: string}> {
  return transcribeAudioFlow(audioDataUri);
}

