import React, { useEffect, useRef, useState } from 'react'
import { FiSave, FiUser, FiLock, FiShield, FiEye, FiEyeOff, FiCheck, FiCamera, FiRefreshCw, FiCheckCircle } from 'react-icons/fi'
import { useSelector, useDispatch } from 'react-redux'
import { setUser } from '../redux/store'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import * as faceapi from 'face-api.js'

const MODELS_URL = '/models'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Module-level cache — models load only once per browser session
let _modelsOK = false
const ensureModels = async () => {
  if (_modelsOK) return
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL)
  await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL)
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL)
  _modelsOK = true
}

function _d(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }
function earBoth(lm) {
  const p = lm.positions
  const e = (i) => (_d(p[i[1]], p[i[5]]) + _d(p[i[2]], p[i[4]])) / 2 / _d(p[i[0]], p[i[3]])
  return (e([36, 37, 38, 39, 40, 41]) + e([42, 43, 44, 45, 46, 47])) / 2
}

const tinyOpts = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
const detectFace = (v) => faceapi.detectSingleFace(v, tinyOpts()).withFaceLandmarks(true)
const detectDescriptor = (v) => faceapi.detectSingleFace(v, tinyOpts()).withFaceLandmarks(true).withFaceDescriptor()

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

const FaceIDSection = ({ user }) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const aliveRef  = useRef(false)

  const [stage, setStage]       = useState('idle')  // idle | loading | cam | look | blink | capture | success | error
  const [msg, setMsg]           = useState('')
  const [registered, setReg]    = useState(user?.face_registered || false)

  useEffect(() => () => stopAll(), [])

  const stopAll = () => {
    aliveRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const startRegistration = async () => {
    setMsg('')

    // Load models (cached after first run)
    if (!_modelsOK) {
      setStage('loading')
      setMsg('Loading AI models (first time only)…')
      try { await ensureModels() } catch {
        setStage('error'); setMsg('Failed to load AI models.'); return
      }
    }

    setStage('cam'); setMsg('Starting camera…')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360, facingMode: 'user' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    } catch {
      setStage('error'); setMsg('Camera access denied.'); return
    }

    aliveRef.current = true

    // Phase 1: stable face detection
    setStage('look'); setMsg('Look straight at the camera…')
    let steady = 0
    while (aliveRef.current) {
      try {
        const r = await detectFace(videoRef.current)
        steady = r ? steady + 1 : 0
        if (steady >= 4) break
      } catch { steady = 0 }
      await sleep(150)
    }
    if (!aliveRef.current) return

    // Phase 2: blink liveness
    setStage('blink'); setMsg('Now blink once  👁️')
    const t0 = Date.now(); let wasOpen = true
    while (aliveRef.current && Date.now() - t0 < 10_000) {
      try {
        const r = await detectFace(videoRef.current)
        if (r) {
          const ear = earBoth(r.landmarks)
          if (wasOpen && ear < 0.21) { break }
          wasOpen = ear > 0.26
        }
      } catch { /* ignore */ }
      await sleep(80)
    }
    if (!aliveRef.current) return

    // Phase 3: capture descriptor
    setStage('capture'); setMsg('Capturing face…')
    let result = null
    for (let i = 0; i < 5 && aliveRef.current; i++) {
      try { result = await detectDescriptor(videoRef.current) } catch { /* ignore */ }
      if (result) break
      await sleep(100)
    }

    if (!result) {
      setStage('error'); setMsg('Could not read face clearly. Try better lighting.')
      stopAll(); return
    }

    setStage('capture'); setMsg('Saving to server…')
    try {
      await authAPI.faceRegister(Array.from(result.descriptor))
      setStage('success'); setMsg('Face ID registered! You can now log in with your face.')
      setReg(true)
      toast.success('Face ID registered successfully!')
      stopAll()
    } catch {
      setStage('error'); setMsg('Failed to save — please try again.')
      stopAll()
    }
  }

  const reset = () => { stopAll(); setStage('idle'); setMsg('') }

  const isStream = ['cam', 'look', 'blink', 'capture'].includes(stage)

  return (
    <SectionCard title="Face ID Authentication" icon={FiCamera}>
      <div className="flex flex-col gap-4">

        {/* Status badge */}
        <div>
          {registered
            ? <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5"><FiCheckCircle size={14} /> Face ID Registered</span>
            : <span className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">Face ID not set up</span>}
        </div>

        {/* Camera preview */}
        {isStream && (
          <div className="relative w-full max-w-xs aspect-[4/3] rounded-2xl overflow-hidden bg-gray-900 border-2 border-yellow-400 mx-auto">
            <video ref={videoRef} muted playsInline autoPlay
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
            {/* Corner brackets */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-3 left-3 w-7 h-7 border-t-[3px] border-l-[3px] border-yellow-400 rounded-tl-lg" />
              <div className="absolute top-3 right-3 w-7 h-7 border-t-[3px] border-r-[3px] border-yellow-400 rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-7 h-7 border-b-[3px] border-l-[3px] border-yellow-400 rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 w-7 h-7 border-b-[3px] border-r-[3px] border-yellow-400 rounded-br-lg" />
            </div>
            {stage === 'blink' && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full animate-bounce">
                Blink Now!
              </div>
            )}
            {stage === 'capture' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Status message */}
        {msg && (
          <p className={`text-sm font-semibold ${stage === 'success' ? 'text-green-600' : stage === 'error' ? 'text-red-600' : 'text-gray-700'}`}>
            {stage === 'loading'
              ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />{msg}</span>
              : msg}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 flex-wrap">
          {!isStream && stage !== 'success' && stage !== 'loading' && (
            <button onClick={startRegistration}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2.5 rounded-lg transition text-sm">
              <FiCamera size={14} />
              {registered ? 'Re-register Face' : 'Set Up Face ID'}
            </button>
          )}
          {stage === 'success' && (
            <button onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              <FiRefreshCw size={14} /> Re-register
            </button>
          )}
          {(isStream || stage === 'error') && (
            <button onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              <FiRefreshCw size={14} /> {isStream ? 'Cancel' : 'Try Again'}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400">Your face is converted to 128 numbers in your browser. Only the numbers are saved — never the image.</p>
      </div>
    </SectionCard>
  )
}

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
      const response = await authAPI.updateMe(profile)
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
        new_password_confirm: passwords.confirm_password,
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

      {/* Face ID Section */}
      <FaceIDSection user={user} />

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
