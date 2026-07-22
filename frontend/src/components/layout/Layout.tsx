import { NavLink, Link } from 'react-router-dom'
import { FileText, Home, History, Brain, MessageSquare, LogOut, User, BookOpen, Building2, FileSearch, Layers, BarChart2, Mic } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/resume', label: 'Resume', icon: FileText },
  { to: '/study', label: 'Study Guide', icon: BookOpen },
  { to: '/flashcards', label: 'Flashcards', icon: Layers },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/jd-match', label: 'JD Match', icon: FileSearch },
  { to: '/history', label: 'History', icon: History },
  { to: '/progress', label: 'Progress', icon: BarChart2 },
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 font-bold text-primary-600 text-base">
            <Brain size={22} />
            InterviewPrep
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )
              }
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          <Link
            to="/account"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full"
          >
            <User size={16} className="shrink-0" />
            <span className="truncate">{user?.username}</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut size={16} className="shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-8 py-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
