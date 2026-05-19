import React, { useEffect, useState } from 'react'
import { FiSave, FiUser, FiLock, FiShield, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi'
import { useSelector, useDispatch } from 'react-redux'
import { setUser } from '../redux/store'
import { userAPI, authAPI } from '../services/api'
import toast from 'react-hot-toast'

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
      <div className="bg-yellow-400 p-1.5 rounded-lg">
        <Icon size={16} className="text-black" />
      </div>
      <h2 className="font-bold text-gray-900">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
)

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-gray-50 transition'

const SettingsPage = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const [profile, setProfile] = useState({ first_name: '', last_name: '', phone: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [savingPass, setSavingPass] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const response = await userAPI.update(user.id, profile)
      dispatch(setUser({ ...user, ...response.data }))
      setProfileSaved(true)
      toast.success('Profile updated successfully')
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Profile update failed')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    if (passwords.new_password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSavingPass(true)
    try {
      await authAPI.changePassword({
        old_password: passwords.old_password,
        new_password: passwords.new_password,
        confirm_password: passwords.confirm_password,
      })
      toast.success('Password changed successfully')
      setPasswords({ old_password: '', new_password: '', confirm_password: '' })
    } catch (error) {
      toast.error(
        error.response?.data?.old_password?.[0] ||
        error.response?.data?.detail ||
        'Password change failed'
      )
    } finally {
      setSavingPass(false)
    }
  }

  const roleColor = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-blue-100 text-blue-700',
    technician: 'bg-purple-100 text-purple-700',
    sales_staff: 'bg-green-100 text-green-700',
    inventory_staff: 'bg-orange-100 text-orange-700',
    customer: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your profile and account security</p>
      </div>

      {/* Account Info Banner */}
      <div className="bg-gray-900 text-white rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-xl flex-shrink-0">
          {[user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('') || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg">{user?.first_name} {user?.last_name}</p>
          <p className="text-gray-400 text-sm truncate">{user?.email}</p>
          <span className={`mt-1.5 inline-block text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${roleColor[user?.role] || 'bg-gray-100 text-gray-700'}`}>
            {user?.role?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Profile Section */}
      <SectionCard title="Profile Information" icon={FiUser}>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">First Name</label>
              <input
                className={inputClass}
                value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last Name</label>
              <input
                className={inputClass}
                value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
            <input
              className={`${inputClass} opacity-60 cursor-not-allowed`}
              value={user?.email || ''}
              readOnly
              title="Email cannot be changed"
            />
            <p className="mt-1 text-xs text-gray-400">Email address cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
            <input
              className={inputClass}
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-5 py-2.5 rounded-lg transition disabled:opacity-60 text-sm"
            >
              {savingProfile ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : profileSaved ? (
                <FiCheck size={16} />
              ) : (
                <FiSave size={16} />
              )}
              {savingProfile ? 'Saving...' : profileSaved ? 'Saved!' : 'Save Profile'}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Password Section */}
      <SectionCard title="Change Password" icon={FiLock}>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                className={`${inputClass} pr-10`}
                value={passwords.old_password}
                onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                placeholder="Enter current password"
                required
              />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showOld ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className={`${inputClass} pr-10`}
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                placeholder="Min 8 characters"
                required
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              className={inputClass}
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              placeholder="Repeat new password"
              required
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPass}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold px-5 py-2.5 rounded-lg transition disabled:opacity-60 text-sm"
            >
              {savingPass ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiLock size={16} />
              )}
              {savingPass ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Account Details */}
      <SectionCard title="Account Details" icon={FiShield}>
        <div className="space-y-3">
          {[
            { label: 'User ID', value: user?.id },
            { label: 'Role', value: user?.role?.replace('_', ' ') },
            { label: 'Account Status', value: user?.is_active ? 'Active' : 'Inactive' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500 font-medium">{label}</span>
              <span className="text-sm font-semibold text-gray-900 capitalize">{value || '—'}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export default SettingsPage
