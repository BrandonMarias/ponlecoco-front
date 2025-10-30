export interface RouletteQuestion {
  id?: string;
  question: string;
  answer: string;
  value: number;
  imageUrl?: string;
}

export interface Roulette {
  id?: string;
  title: string;
  questions: RouletteQuestion[];
  userId?: string;
  isShared?: boolean; // Field to track if roulette is publicly shared
}
