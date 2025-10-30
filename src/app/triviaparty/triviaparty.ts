export interface Question {
  id?: string; // Optional, might be provided by backend
  question: string;
  answer: string;
  value: number;
  doublePoints?: boolean;
  imageUrl?: string;
}

export interface Category {
  id?: string;
  title: string;
  questions: Question[];
}

export interface TriviaParty {
  id?: string;
  title: string;
  categories: Category[];
  userId?: string; // Assuming backend links triviaparty to a user
  type?: 'triviaparty' | 'ruleta'; // New field to distinguish between trivia types
  isShared?: boolean; // Field to track if trivia is publicly shared
}
