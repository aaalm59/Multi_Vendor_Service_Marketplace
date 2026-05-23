import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setRefreshToken, setUser, setToken } from '../redux/store'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  FiMail, FiLock, FiZap, FiEye, FiEyeOff,
  FiCamera, FiRefreshCw, FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi'
import * as faceapi from 'face-api.js'

const MODELS_URL = '/models'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Module-level model cache — only loads once per browser session ─────────────
let _modelsReady = false
const ensureModels = async () => {
  if (_modelsReady) return
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL)
  await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL)
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL)
  _modelsReady = true
}

// ── EAR (eye aspect ratio) — blink when < 0.20 ───────────────────────────────
function _d(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }
function earBoth(lm) {
  const p = lm.positions
  const ear = (i) => (_d(p[i[1]], p[i[5]]) + _d(p[i[2]], p[i[4]])) / 2 / _d(p[i[0]], p[i[3]])
  return (ear([36, 37, 38, 39, 40, 41]) + ear([42, 43, 44, 45, 46, 47])) / 2
}

// ── Detection helpers ─────────────────────────────────────────────────────────
const tinyOpts = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
const detectFace = (video) =>
  faceapi.detectSingleFace(video, tinyOpts()).withFaceLandmarks(true)
const detectDescriptor = (video) =>
  faceapi.detectSingleFace(video, tinyOpts()).withFaceLandmarks(true).withFaceDescriptor()

// ─────────────────────────────────────────────────────────────────────────────
const ST = { LOAD: 'load', IDLE: 'idle', CAM: 'cam', LOOK: 'look', BLINK: 'blink', CAPTURE: 'capture', VERIFY: 'verify', OK: 'ok', ERR: 'err' }

const STEPS = [
  { id: ST.LOOK,    label: 'Look at camera' },
  { id: ST.BLINK,   label: 'Blink once' },
  { id: ST.CAPTURE, label: 'Capturing' },
  { id: ST.VERIFY,  label: 'Verifying' },
]

// ── Manual Login ──────────────────────────────────────────────────────────────
const ManualLogin = ({ onSuccess }) => {
  const dispatch = useDispatch()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authAPI.login(form.email, form.password)
      dispatch(setUser(data.user))
      dispatch(setToken(data.tokens.access))
      dispatch(setRefreshToken(data.tokens.refresh))
      toast.success('Login successful!')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
        <div className="relative">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required placeholder="you@example.com"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm bg-gray-50" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
        <div className="relative">
          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type={showPwd ? 'text' : 'password'} value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required placeholder="••••••••"
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm bg-gray-50" />
          <button type="button" onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
        {loading
          ? <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Signing in…</>
          : <><FiZap size={16} />Sign In</>}
      </button>
    </form>
  )
}

// ── Face Login ────────────────────────────────────────────────────────────────
const FaceLogin = ({ onSuccess }) => {
  const dispatch = useDispatch()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const aliveRef = useRef(false)

  const [stage, setStage] = useState(ST.IDLE)
  const [msg, setMsg]     = useState('')
  const [error, setError] = useState('')
  const [hint, setHint]   = useState('')

  const stopAll = () => {
    aliveRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }
  useEffect(() => () => stopAll(), [])

  // ── Step 0: Load models + open camera ──────────────────────────────────────
  const start = async () => {
    setError('')
    setHint('')

    // Load models (skip if already loaded)
    if (!_modelsReady) {
      setStage(ST.LOAD)
      setMsg('Loading face AI models…')
      try { await ensureModels() } catch {
        setStage(ST.ERR)
        setError('Failed to load AI models. Check your internet connection.')
        return
      }
    }

    setStage(ST.CAM)
    setMsg('Starting camera…')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360, facingMode: 'user' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    } catch {
      setStage(ST.ERR)
      setError('Camera access denied. Allow camera permissions and try again.')
      return
    }

    aliveRef.current = true
    await scanFace()
  }

  // ── Step 1: Wait until a face is steadily visible ─────────────────────────
  const scanFace = async () => {
    setStage(ST.LOOK)
    setMsg('Look straight at the camera…')
    setHint('Make sure your face is well-lit and centred')

    let hits = 0
    while (aliveRef.current) {
      try {
        const r = await detectFace(videoRef.current)
        if (r) {
          hits++
          if (hits >= 4) { await waitForBlink(); return }
        } else {
          hits = 0
        }
      } catch { /* ignore single frame errors */ }
      await sleep(150)
    }
  }

  // ── Step 2: Liveness — one natural blink ──────────────────────────────────
  const waitForBlink = async () => {
    setStage(ST.BLINK)
    setMsg('Now blink once  👁️')
    setHint('Slowly close and open your eyes')

    const TIMEOUT = 10_000
    const t0 = Date.now()
    let wasOpen = true   // track eye-open → closed transition

    while (aliveRef.current && Date.now() - t0 < TIMEOUT) {
      try {
        const r = await detectFace(videoRef.current)
        if (r) {
          const ear = earBoth(r.landmarks)
          if (wasOpen && ear < 0.21) {
            // Eyes just closed — blink confirmed
            await captureAndLogin()
            return
          }
          wasOpen = ear > 0.26
        }
      } catch { /* ignore */ }
      await sleep(80)
    }

    // Timed out — offer to skip liveness and just capture
    if (aliveRef.current) {
      setHint('Blink not detected — trying direct capture…')
      await sleep(600)
      await captureAndLogin()
    }
  }

  // ── Step 3: Get face descriptor and call backend ───────────────────────────
  const captureAndLogin = async () => {
    setStage(ST.CAPTURE)
    setMsg('Capturing face…')
    setHint('')

    let result = null
    for (let attempt = 0; attempt < 5 && aliveRef.current; attempt++) {
      try { result = await detectDescriptor(videoRef.current) } catch { /* ignore */ }
      if (result) break
      await sleep(100)
    }

    if (!result) {
      setStage(ST.ERR)
      setError('Could not capture face clearly. Please try again in better lighting.')
      stopAll()
      return
    }

    setStage(ST.VERIFY)
    setMsg('Verifying identity…')
    try {
      const { data } = await authAPI.faceLogin(Array.from(result.descriptor))
      dispatch(setUser(data.user))
      dispatch(setToken(data.tokens.access))
      dispatch(setRefreshToken(data.tokens.refresh))
      setStage(ST.OK)
      setMsg(`Welcome back, ${data.user.first_name || data.user.email}!`)
      stopAll()
      setTimeout(() => { toast.success('Face login successful!'); onSuccess() }, 700)
    } catch (err) {
      const m = err.response?.data?.error || 'Face not recognised'
      setStage(ST.ERR)
      setError(m)
      stopAll()
    }
  }

  const reset = () => { stopAll(); setStage(ST.IDLE); setMsg(''); setError(''); setHint('') }

  const isStream = [ST.CAM, ST.LOOK, ST.BLINK, ST.CAPTURE, ST.VERIFY].includes(stage)
  const activeStep = STEPS.findIndex((s) => s.id === stage)

  return (
    <div className="flex flex-col items-center gap-4">

      {/* Step indicator */}
      {isStream && (
        <div className="flex items-center gap-0 w-full max-w-xs">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < activeStep ? 'bg-green-500 text-white' :
                  i === activeStep ? 'bg-yellow-400 text-black' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {i < activeStep ? '✓' : i + 1}
                </div>
                <span className={`text-[9px] mt-0.5 font-medium ${i === activeStep ? 'text-yellow-600' : 'text-gray-400'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-3 mx-1 ${i < activeStep ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Camera viewport */}
      <div className="relative w-full max-w-xs aspect-[4/3] rounded-2xl overflow-hidden bg-gray-900 border-2 border-gray-800 shadow-inner">
        <video ref={videoRef} muted playsInline autoPlay
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          style={{ display: isStream ? 'block' : 'none' }} />

        {!isStream && (
          <div className="absolute inset-0 flex items-center justify-center">
            {stage === ST.OK   && <FiCheckCircle size={56} className="text-green-400" />}
            {stage === ST.ERR  && <FiAlertCircle size={56} className="text-red-400" />}
            {(stage === ST.IDLE || stage === ST.LOAD) && <FiCamera size={52} className="text-gray-600" />}
          </div>
        )}

        {/* Corner brackets */}
        {isStream && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-4 w-8 h-8 border-t-[3px] border-l-[3px] border-yellow-400 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-[3px] border-r-[3px] border-yellow-400 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-[3px] border-l-[3px] border-yellow-400 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-[3px] border-r-[3px] border-yellow-400 rounded-br-lg" />
          </div>
        )}

        {/* Pulse ring when looking */}
        {stage === ST.LOOK && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-28 h-28 rounded-full border-2 border-yellow-400 opacity-40 animate-ping" />
          </div>
        )}

        {/* Blink animation */}
        {stage === ST.BLINK && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-bold animate-bounce">
            Blink Now!
          </div>
        )}

        {/* Processing overlay */}
        {(stage === ST.CAPTURE || stage === ST.VERIFY) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Status text */}
      {(msg || stage === ST.LOAD) && (
        <div className="text-center">
          <p className={`text-sm font-bold ${stage === ST.OK ? 'text-green-600' : stage === ST.ERR ? 'text-red-600' : 'text-gray-800'}`}>
            {stage === ST.LOAD ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                Loading face AI models (first time only)…
              </span>
            ) : msg}
          </p>
          {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
      )}

      {/* Error box */}
      {error && (
        <div className="w-full max-w-xs bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
          <p className="text-sm text-red-700 font-semibold">{error}</p>
          {error.includes('not recognised') && (
            <p className="text-xs text-red-500 mt-1">Make sure you registered your face in Settings first.</p>
          )}
        </div>
      )}

      {/* Buttons */}
      {stage === ST.IDLE && (
        <button onClick={start}
          className="w-full max-w-xs bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow">
          <FiCamera size={16} /> Start Face Scan
        </button>
      )}

      {(stage === ST.ERR || stage === ST.OK) && (
        <button onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
          <FiRefreshCw size={14} /> Try Again
        </button>
      )}

      {isStream && (
        <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 underline">Cancel</button>
      )}

      <p className="text-xs text-gray-400 text-center max-w-xs leading-relaxed">
        Face processing happens in your browser. Only a 128-number descriptor is sent — never the image.
      </p>
    </div>
  )
}

// ── Page layout ───────────────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState('manual')
  const onSuccess = () => navigate('/dashboard')

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(250,204,21,0.15),_transparent_60%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-yellow-400 p-2 rounded-lg"><FiZap size={28} className="text-black" /></div>
            <div>
              <h1 className="text-white font-bold text-2xl leading-none">Bharat Electric</h1>
              <p className="text-yellow-400 text-xs font-medium tracking-widest uppercase">Service ERP</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage Your<br /><span className="text-yellow-400">Electric Business</span><br />Like a Pro
          </h2>
          <p className="text-gray-400 text-base leading-relaxed">
            Complete ERP for electric repair shops — bookings, inventory, billing, staff & reports in one place.
          </p>
        </div>
        <div className="relative z-10 space-y-4">
          {[
            { icon: '⚡', label: 'Service Bookings', desc: 'Assign & track technicians' },
            { icon: '🏪', label: 'POS & Billing', desc: 'GST invoices, UPI/cash' },
            { icon: '📦', label: 'Inventory', desc: 'Stock alerts, barcode scan' },
            { icon: '📊', label: 'Reports', desc: 'Revenue, profit & loss' },
            { icon: '🔐', label: 'Face Login', desc: 'Credential-free authentication' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <span className="text-2xl w-8 text-center">{item.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="relative z-10 flex items-center gap-3 border-t border-gray-800 pt-6">
          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm">B</div>
          <div>
            <p className="text-white text-sm font-semibold">Bharat Electric Repairing</p>
            <p className="text-gray-500 text-xs">सलेमगढ़, बसडिला गुणगान, रोड</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="bg-yellow-400 p-2 rounded-lg"><FiZap size={22} className="text-black" /></div>
            <div>
              <h1 className="font-bold text-xl text-gray-900 leading-none">Bharat Electric ERP</h1>
              <p className="text-yellow-500 text-xs font-medium tracking-widest uppercase">Service Management</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 mt-1 text-sm">Choose your preferred sign-in method</p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
              <button onClick={() => setTab('manual')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${tab === 'manual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <FiLock size={14} /> Password
              </button>
              <button onClick={() => setTab('face')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${tab === 'face' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <FiCamera size={14} /> Face ID
              </button>
            </div>

            {tab === 'manual' ? (
              <>
                <ManualLogin onSuccess={onSuccess} />
                <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                  <p className="text-sm text-gray-500">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-yellow-500 font-semibold hover:underline">Create one</Link>
                  </p>
                </div>
                <div className="mt-4 rounded-lg bg-gray-50 p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Demo Credentials</p>
                  <p className="text-xs text-gray-600">Admin: <span className="font-mono">admin@example.com</span> / <span className="font-mono">admin123</span></p>
                  <p className="text-xs text-gray-600">Manager: <span className="font-mono">manager@example.com</span> / <span className="font-mono">manager123</span></p>
                </div>
              </>
            ) : (
              <>
                <FaceLogin onSuccess={onSuccess} />
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-400">
                    Haven't registered your face yet?{' '}
                    <span className="text-yellow-600 font-semibold">Sign in with password → Settings → Set Up Face ID.</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
