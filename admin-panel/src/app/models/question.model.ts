export interface Option {
  _id?: { $oid: string } | string; // Allow for both object and plain string ID
  text: string;
  img?: string;
  isCorrect: boolean;
}

// ADDED: Interface for structured explanations
export interface Explanation {
  _id?: { $oid: string } | string;
  type: 'text' | 'video' | 'pdf' | 'image';
  label?: string;
  content: string; // URL for video/pdf/image, text for text
}

export interface Translation {
  _id?: { $oid: string } | string;
  lang: string;
  questionText: string;
  images?: string[];
  options: Option[];
  explanations?: Explanation[]; // UPDATED to use Explanation interface
}

// ADDED: Interface for populated hierarchical fields
export interface PopulatedHierarchyField {
  _id: string | { $oid: string };
  name: string;
  // Add other properties if they exist for populated fields
}

export interface Question {
  _id: { $oid: string } | string;

  // Allow for string ID, $oid object, or a fully populated object for hierarchical data
  branch?: string | { $oid: string } | PopulatedHierarchyField;
  subject?: string | { $oid: string } | PopulatedHierarchyField;
  topic?: string | { $oid: string } | PopulatedHierarchyField;
  subTopic?: string | { $oid: string } | PopulatedHierarchyField; // Corrected casing

  translations: Translation[];
  difficulty: '' | 'Easy' | 'Medium' | 'Hard';
  type?: string;
  explanations?: any[];
  questionHistory?: any[];
  status?: string;
  version?: { $numberInt: string } | number;
  createdBy?: { $oid: string } | string;
  createdAt?: { $date: { $numberLong: string } } | Date | string;
  updatedAt?: { $date: { $numberLong: string } } | Date | string;
  __v?: { $numberInt: string } | number;

  // ADDED: Top-level fields for simpler display in lists (e.g., QuestionListComponent)
  // These would typically be populated from the primary translation by the service/backend for list views.
  questionText?: string;
  options?: Option[];

  // Keep original fields for compatibility if they are still used elsewhere directly,
  // but prefer using the translations array for text and options.
  // questionText?: string; // This might be from an older structure or a simplified view
  // options?: { text: string; isCorrect: boolean }[]; // This is now inside each Translation

  // ID values for submission (can be kept if used, or derived from main _id objects)
  branchId?: string;
  subjectId?: string;
  topicId?: string;
  // subtopicId?: string; // Covered by subTopic

  // Populated objects for listing (can be kept if used)
  // branch?: { _id: string; name: string }; // Covered by main branch object
  // subject?: { _id: string; name: string }; // Covered by main subject object
  // topic?: { _id: string; name: string }; // Covered by main topic object
  // subtopic?: { _id: string; name: string }; // Covered by main subTopic object
}
