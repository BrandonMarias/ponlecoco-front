export interface AiCategoryRequest {
  topic: string;
}

export interface AiCategoryResponse {
  category: string;
  questions: {
    question: string;
    answer: string;
    value: number;
  }[];
}
