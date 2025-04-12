export interface Question {
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  branchId: string;
  subjectId: string;
  topicId: string;
  subtopicId: string;
  difficulty: '' | 'Easy' | 'Medium' | 'Hard'; // <-- updated here
  explanation?: string;
}
