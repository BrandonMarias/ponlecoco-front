export interface QuickThinkingQuestion {
  id?: string;
  question: string;
  options: string[]; // Array of 4 options
  correctAnswerIndex: number; // Index (0-3) of the correct answer
  imageUrl?: string; // Optional image for the question
}

export interface QuickThinking {
  id?: string;
  title: string;
  questions: QuickThinkingQuestion[];
  userId?: string;
  isShared?: boolean; // Field to track if quick thinking is publicly shared
}
