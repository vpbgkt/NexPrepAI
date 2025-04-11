export interface Question {
  questionText: string;
  options: string[];
  correctOption: number;
  explanation?: string;
  difficulty?: string;
  branch: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
}
