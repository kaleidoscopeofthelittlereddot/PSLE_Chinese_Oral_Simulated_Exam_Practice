export interface VideoScene {
  sceneNumber: number;
  description: string;
  imageUrl?: string;
}

export interface ExamConfig {
  theme: string;
  narration: string;
  scenes: VideoScene[];
  customQuestions?: {
    q1?: string;
    q2?: string;
    q3?: string;
    q4?: string;
  };
}

export type ExamState = 
  | 'setup' 
  | 'video_watching' 
  | 'exam_active' 
  | 'exam_completed' 
  | 'feedback_active' 
  | 'report_ready';

export interface ChatMessage {
  id: string;
  sender: 'examiner' | 'student' | 'tutor';
  text: string;
  timestamp: string;
  audioBase64?: string; // Optional audio
  audioUrl?: string; // Downloadable audio Blob URL or Data URL
  audioMimeType?: string; // Mime type e.g. audio/webm, audio/mp4, audio/wav
  questionNumber?: number; // Question number index (1-4)
  pauseTimeSec?: number; // Thinking/pause duration before starting answer in seconds
  answerTimeSec?: number; // Answer speech duration in seconds
}

export interface PhoneticError {
  word: string;
  student_pronounced_as: string;
  correct_pinyin: string;
  error_type: string;
}

export interface RubricComponent {
  score: number;
  max_score: number;
  observations: string;
  filler_word_count?: Record<string, number>;
}

export interface ExamReport {
  isFallback?: boolean;
  score: number; // total score out of 30
  total_score?: number; // alias for total score
  contentScore?: number;
  languageScore?: number;
  rubric_breakdown?: {
    pronunciation_and_tones: RubricComponent;
    fluency_and_delivery: RubricComponent;
    content_elaboration: RubricComponent;
    vocabulary_expression: RubricComponent;
  };
  rubricBreakdown?: {
    pronunciation?: string;
    vocabulary?: string;
    fluency?: string;
    elaboration?: string;
  };
  specific_phonetic_errors?: PhoneticError[];
  teacher_coaching_feedback?: string;
  analysis: {
    q1: string;
    q2: string;
    q3: string;
    q4: string;
  };
  strengths: string[]; // key strengths
  weaknesses: string[]; // key areas to improve
  modelAnswers?: {
    q1: string;
    q2: string;
    q3: string;
    q4: string;
  };
}
