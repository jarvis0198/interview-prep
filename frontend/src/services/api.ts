import axios from 'axios'
import type {
  Resume,
  ResumeSuggestionResponse,
  PrepSession,
  Question,
  ResumeScoreResponse,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  AuthResponse,
  GithubQuestion,
} from '../types'

const api = axios.create({
  baseURL: (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { username, email, password }),

  login: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { username, password }),

  me: () => api.get<AuthResponse>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
}

export const resumeApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Resume>('/resumes/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  uploadText: (content: string) =>
    api.post<Resume>('/resumes/text', { content }),

  build: (mode: string, input: string) =>
    api.post<Resume>('/resumes/build', { mode, input }),

  getAll: () => api.get<Resume[]>('/resumes'),

  getById: (id: number) => api.get<Resume>(`/resumes/${id}`),

  update: (id: number, content: string) =>
    api.put<Resume>(`/resumes/${id}`, { content }),

  updateTemplate: (id: number, templateName: string) =>
    api.patch<Resume>(`/resumes/${id}/template`, { templateName }),

  updateTitle: (id: number, title: string) =>
    api.patch<Resume>(`/resumes/${id}/title`, { title }),

  delete: (id: number) => api.delete(`/resumes/${id}`),

  score: (id: number) => api.post<ResumeScoreResponse>(`/resumes/${id}/score`),

  getSuggestions: (id: number) =>
    api.post<ResumeSuggestionResponse>(`/resumes/${id}/suggestions`),
}

export const questionsApi = {
  generate: (req: GenerateQuestionsRequest) =>
    api.post<GenerateQuestionsResponse>('/questions/generate', req),

  getBySession: (sessionId: number) =>
    api.get<Question[]>(`/questions/session/${sessionId}`),

  getSolution: (questionId: number) =>
    api.post<Question>(`/questions/${questionId}/solution`),

  getSessions: () => api.get<PrepSession[]>('/questions/sessions'),

  deleteSession: (sessionId: number) =>
    api.delete(`/questions/sessions/${sessionId}`),

  getGithubCompanies: () =>
    api.get<string[]>('/questions/github-companies'),

  getGithubQuestions: (company: string) =>
    api.get<GithubQuestion[]>(`/questions/github/${encodeURIComponent(company)}`),
}

export const chatApi = {
  send: (resumeId: number | null, question: string) =>
    api.post<{ answer: string }>('/chat', { resumeId, question }),
}

export const studyApi = {
  getProgress: () => api.get<string[]>('/study/progress'),
  toggle: (subtopicId: string) => api.post<string[]>('/study/progress/toggle', { subtopicId }),
  reset: () => api.post<string[]>('/study/progress/reset'),
}
