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

export interface Jeopardy {
  id?: string;
  title: string;
  categories: Category[];
  userId?: string; // Assuming backend links jeopardy to a user
}
