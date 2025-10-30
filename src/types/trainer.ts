
import { z } from 'zod';

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

// Types for Voice Call Simulation
export type CallPersona = {
    gender: 'Male' | 'Female';
    attitude: 'Cold' | 'Warm' | 'Ready to Buy';
    qualification: 'Good Fit' | 'Bad Fit' | 'Unsure';
};

export type CallSimulationInput = {
    persona: CallPersona;
    conversationHistory: { role: 'user' | 'assistant'; text: string }[];
    trainingData?: string;
};

export type SimulationOutput = {
    response?: string;
    audioUrl?: string;
    feedback?: SimulationFeedback;
    isComplete: boolean;
};
