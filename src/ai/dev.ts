
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-training-progress.ts';
import '@/ai/flows/generate-initial-training-plan.ts';
import '@/ai/flows/closing-simulation-flow.ts';
import '@/ai/flows/cold-call-simulation-flow.ts';
import '@/ai/flows/discovery-simulation-flow.ts';
import '@/ai/flows/proposal-simulation-flow.ts';
import '@/ai/flows/prospecting-simulation-flow.ts';
import '@/ai/flows/qualification-simulation-flow.ts';
