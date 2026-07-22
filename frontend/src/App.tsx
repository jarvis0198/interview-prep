import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import ResumePage from './pages/ResumePage'
import QuestionsPage from './pages/QuestionsPage'
import HistoryPage from './pages/HistoryPage'
import ChatPage from './pages/ChatPage'
import AccountPage from './pages/AccountPage'
import StudyGuidePage from './pages/StudyGuidePage'
import CompanyQuestionsPage from './pages/CompanyQuestionsPage'
import JdMatchPage from './pages/JdMatchPage'
import MockInterviewPage from './pages/MockInterviewPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/resume" element={<ResumePage />} />
                  <Route path="/questions/:sessionId" element={<QuestionsPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/study" element={<StudyGuidePage />} />
                  <Route path="/companies" element={<CompanyQuestionsPage />} />
                  <Route path="/jd-match" element={<JdMatchPage />} />
                  <Route path="/mock/:sessionId" element={<MockInterviewPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
