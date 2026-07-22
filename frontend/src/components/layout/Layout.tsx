import { NavLink, Link } from 'react-router-dom'
import { FileText, Home, History, Brain, MessageSquare, LogOut, User, BookOpen, Building2, FileSearch, Mic } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/resume', label: 'Resume', icon: FileText },
  { to: '/study', label: 'Study', icon: BookOpen },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/jd-match', label: 'JD Match', icon: FileSearch },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/history', label: 'History', icon: History },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-primary-600 text-lg">
            <Brain size={24} />
            InterviewPrep
          </div>
          <nav className="flex gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100',
                  )
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/account"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors"
            >
              <User size={16} />
              <span className="font-medium">{user?.username}</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  )
}
