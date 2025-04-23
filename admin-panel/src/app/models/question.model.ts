export interface Question {
  _id: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  difficulty: '' | 'Easy' | 'Medium' | 'Hard';
  explanation?: string;

  // ID values for submission
  branchId?: string;
  subjectId?: string;
  topicId?: string;
  subtopicId?: string;

  // Populated objects for listing
  branch?: { _id: string; name: string };
  subject?: { _id: string; name: string };
  topic?: { _id: string; name: string };
  subtopic?: { _id: string; name: string };
}
