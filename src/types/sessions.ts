
import type { SimulationDifficulty, ConversationMessage, SimulationFeedback } from './trainer';

export type TrainingResult = {
    phase: 'Prospecting' | 'Discovery' | 'Qualification' | 'Proposal' | 'Closing';
    difficulty: SimulationDifficulty;
    conversation: ConversationMessage[];
    feedback: SimulationFeedback;
};

export type TrainingSession = {
    id: string;
    name: string;
    results: TrainingResult[];
    createdAt: any; // Firestore Timestamp
};
