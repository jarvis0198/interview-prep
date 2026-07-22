import { useState } from 'react'
import { authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { User, KeyRound, LogOut, Check, AlertCircle } from 'lucide-react'

export default function AccountPage() {
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <User size={24} />
        Account Settings
      </h1>

      {/* Profile info */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Profile</h2>
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Username</label>
            <p className="text-gray-800 font-medium">{user?.username}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Email</label>
            <p className="text-gray-800">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Password change */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <KeyRound size={16} />
          Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <Check size={14} />
              Password updated successfully.
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card border-red-100">
        <h2 className="font-semibold text-gray-800 mb-3">Session</h2>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium border border-red-200 hover:border-red-300 rounded-lg px-4 py-2 transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  )
}
