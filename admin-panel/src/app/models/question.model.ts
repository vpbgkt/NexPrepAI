export interface Question {
  text: string;
  options: string[];
  correctOption: number;
  branch: string;
  subject: string;
  topic?: string;
  subtopic?: string;
}
