export interface User {
  id: number
  username: string
  email: string
}

export interface AuthResponse {
  token: string | null
  id: number
  username: string
  email: string
}

export interface Resume {
  id: number
  content: string
  originalFilename?: string
  title?: string
  score?: number
  scoreFeedback?: string
  templateName?: string
  createdAt: string
  updatedAt: string
}

export interface ResumeSuggestionResponse {
  sectionSuggestions: Record<string, string[]>
  overallTip: string
}

export interface PrepSession {
  id: number
  companyName: string
  targetRole?: string
  resumeId: number
  createdAt: string
}

export interface Question {
  id: number
  type: 'OA' | 'INTERVIEW'
  category: string
  questionText: string
  difficulty?: string
  hint?: string
  sessionId: number
}

export interface ResumeScoreResponse {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
}

export interface GenerateQuestionsRequest {
  resumeId: number
  companyName: string
  targetRole?: string
}

export interface GenerateQuestionsResponse {
  sessionId: number
  oaQuestions: Question[]
  interviewQuestions: Question[]
}

export interface GithubQuestion {
  title: string
  url: string
  occurrences: number
  rank: number
}
