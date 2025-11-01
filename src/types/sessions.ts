
import type { SimulationDifficulty, ConversationMessage, SimulationFeedback } from './trainer';
import type { Session } from './session';

export type TrainingResult = {
    phase: 'Prospecting' | 'Qualification' | 'Proposal' | 'Closing' | 'Cold Call';
    difficulty: SimulationDifficulty | string;
    conversation: ConversationMessage[];
    feedback: SimulationFeedback;
};

// This type might be redundant now, Session from session.ts is more accurate
export type TrainingSession = Session & {
    results: TrainingResult[];
};
