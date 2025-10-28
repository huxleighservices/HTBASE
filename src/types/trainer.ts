

export enum SimulationDifficulty {
    Easy = 'Easy',
    Medium = 'Medium',
    Hard = 'Hard',
}

export type ConversationMessage = {
    role: 'user' | 'assistant';
    content: string;
};

export type SimulationFeedback = {
    overallAssessment: string;
    positivePoints: string[];
    areasForImprovement: string[];
};

export type ProspectingSimulationOutput = {
    isComplete: boolean;
    response: string | null;
    feedback: SimulationFeedback | null;
};

