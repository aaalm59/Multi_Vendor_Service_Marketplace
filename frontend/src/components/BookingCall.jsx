import React, { useEffect, useRef, useState } from 'react'
import { FiPhone, FiPhoneOff, FiVideo, FiVideoOff, FiMic, FiMicOff, FiX } from 'react-icons/fi'

// ── Ringtone via Web Audio API ──────────────────────────────────────────────
export function useRingtone() {
  const ctxRef = useRef(null)
  const timerRef = useRef(null)

  const start = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ctxRef.current = ctx
      const ring = () => {
        [0, 0.6].forEach((offset) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 480
          osc.type = 'sine'
          const t = ctx.currentTime + offset
          gain.gain.setValueAtTime(0.35, t)
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
          osc.start(t)
          osc.stop(t + 0.5)
        })
        timerRef.current = setTimeout(ring, 2200)
      }
      ring()
    } catch { /* AudioContext not available */ }
  }

  const stop = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null }
  }

  return { start, stop }
}

// ── Call duration timer ─────────────────────────────────────────────────────
function useDuration(active) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!active) { setSecs(0); return }
    const id = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [active])
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

// ── Avatar initials ─────────────────────────────────────────────────────────
function Avatar({ name, size = 'lg' }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const cls = size === 'lg'
    ? 'w-24 h-24 text-3xl'
    : 'w-14 h-14 text-xl'
  return (
    <div className={`${cls} rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center ring-4 ring-yellow-300/50`}>
      {initials}
    </div>
  )
}

// ── Pulsing ring animation around avatar ────────────────────────────────────
function PulseRing() {
  return (
    <div className="absolute inset-0 rounded-full border-4 border-yellow-400/30 animate-ping" />
  )
}

// ── Main BookingCall component ───────────────────────────────────────────────
export default function BookingCall({
  callState,     // 'idle' | 'outgoing' | 'incoming' | 'active'
  callType,      // 'audio' | 'video'
  partnerName,   // name of other participant
  localVideoRef,
  remoteVideoRef,
  isMuted,
  isCameraOff,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
}) {
  const duration = useDuration(callState === 'active')

  if (callState === 'idle') return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">

      {/* ── INCOMING CALL ─────────────────────────────── */}
      {callState === 'incoming' && (
        <div className="bg-gray-900 rounded-3xl p-8 w-80 flex flex-col items-center gap-5 shadow-2xl">
          <p className="text-xs text-gray-400 tracking-widest uppercase">
            Incoming {callType === 'video' ? 'Video' : 'Audio'} Call
          </p>
          <div className="relative">
            <Avatar name={partnerName} size="lg" />
            <PulseRing />
          </div>
          <p className="text-white text-xl font-bold">{partnerName}</p>
          <div className="flex gap-6 mt-2">
            <button
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition shadow-lg"
              title="Reject"
            >
              <FiPhoneOff size={24} className="text-white" />
            </button>
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition shadow-lg"
              title="Accept"
            >
              {callType === 'video' ? <FiVideo size={24} className="text-white" /> : <FiPhone size={24} className="text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* ── OUTGOING CALL ─────────────────────────────── */}
      {callState === 'outgoing' && (
        <div className="bg-gray-900 rounded-3xl p-8 w-80 flex flex-col items-center gap-5 shadow-2xl">
          <p className="text-xs text-gray-400 tracking-widest uppercase animate-pulse">
            Calling…
          </p>
          <div className="relative">
            <Avatar name={partnerName} size="lg" />
            <PulseRing />
          </div>
          <p className="text-white text-xl font-bold">{partnerName}</p>
          <p className="text-gray-400 text-sm">{callType === 'video' ? 'Video Call' : 'Voice Call'}</p>
          <button
            onClick={onEnd}
            className="mt-2 w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition shadow-lg"
            title="Cancel"
          >
            <FiPhoneOff size={24} className="text-white" />
          </button>
        </div>
      )}

      {/* ── ACTIVE CALL ───────────────────────────────── */}
      {callState === 'active' && (
        <div className="w-full h-full flex flex-col bg-gray-950 relative">

          {/* Remote video / audio display */}
          {callType === 'video' ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <Avatar name={partnerName} size="lg" />
              </div>
              <p className="text-white text-2xl font-bold">{partnerName}</p>
              <p className="text-gray-400 text-sm">{duration}</p>
            </div>
          )}

          {/* Duration overlay for video */}
          {callType === 'video' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
              {duration}
            </div>
          )}

          {/* Local video PiP (video calls) */}
          {callType === 'video' && (
            <div className="absolute top-4 right-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl bg-gray-800">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              {isCameraOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <FiVideoOff size={20} className="text-gray-400" />
                </div>
              )}
            </div>
          )}

          {/* Partner name overlay */}
          {callType === 'video' && (
            <div className="absolute top-4 left-4 text-white text-sm font-semibold bg-black/40 px-3 py-1 rounded-full">
              {partnerName}
            </div>
          )}

          {/* Controls bar */}
          <div className="absolute bottom-0 left-0 right-0 pb-8 pt-4 flex items-center justify-center gap-5 bg-gradient-to-t from-black/80 to-transparent">
            {/* Mute */}
            <button
              onClick={onToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <FiMicOff size={20} className="text-white" /> : <FiMic size={20} className="text-white" />}
            </button>

            {/* End call */}
            <button
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition shadow-xl"
              title="End call"
            >
              <FiPhoneOff size={24} className="text-white" />
            </button>

            {/* Camera toggle (video only) */}
            {callType === 'video' && (
              <button
                onClick={onToggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${isCameraOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'}`}
                title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isCameraOff ? <FiVideoOff size={20} className="text-white" /> : <FiVideo size={20} className="text-white" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
