
import type { SimulationDifficulty, ConversationMessage, SimulationFeedback } from './trainer';

export type TrainingResult = {
    phase: 'Prospecting' | 'Qualification' | 'Proposal' | 'Closing' | 'Cold Call';
    difficulty: SimulationDifficulty | string;
    conversation: ConversationMessage[];
    feedback: SimulationFeedback;
    createdAt?: any;
};
