import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import BookingCall, { useRingtone } from '../components/BookingCall'

const defaultWsBase =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
    : ''
const WS_BASE = (import.meta.env.VITE_WS_URL || defaultWsBase).replace(/^http/, 'ws')
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

const CallContext = createContext(null)
export const useCallContext = () => useContext(CallContext)

export function CallProvider({ children }) {
  const { user, token } = useSelector((s) => s.auth)

  // ── call UI state ──────────────────────────────────────────────────────────
  const [callState, setCallState]         = useState('idle')   // idle|outgoing|incoming|active
  const [callType, setCallType]           = useState('audio')  // audio|video
  const [callPartnerName, setCallPartnerName] = useState('')
  const [isMuted, setIsMuted]             = useState(false)
  const [isCameraOff, setIsCameraOff]     = useState(false)

  // ── refs (don't trigger re-render) ────────────────────────────────────────
  const wsRef          = useRef(null)
  const pcRef          = useRef(null)
  const localStreamRef = useRef(null)
  const pendingRef     = useRef(null)   // { offer, toUser, callType, bookingId, bookingNumber }
  const toUserRef      = useRef(null)   // user-id of the other party
  const localVideoRef  = useRef(null)
  const remoteVideoRef = useRef(null)
  const ringtone       = useRingtone()
  const retryRef       = useRef(null)
  const pendingSendsRef = useRef([])

  // ── Open / close global call WS when auth changes ─────────────────────────
  useEffect(() => {
    if (!user || !token) {
      _closeWS()
      return
    }
    _openWS()
    return () => _closeWS()
  }, [user?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  function _openWS() {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) return
    const accessToken = token || Cookies.get('access_token') || ''
    const ws = new WebSocket(`${WS_BASE}/ws/user/call/?token=${accessToken}`)
    wsRef.current = ws

    ws.onopen = () => {
      const queued = pendingSendsRef.current
      pendingSendsRef.current = []
      queued.forEach((item) => ws.send(JSON.stringify(item)))
    }
    ws.onmessage = (e) => {
      try { _handleSignal(JSON.parse(e.data)) } catch { /* ignore */ }
    }
    ws.onclose = () => {
      wsRef.current = null
      // Auto-reconnect after 4 s if still logged in
      retryRef.current = setTimeout(() => { if (user) _openWS() }, 4000)
    }
    ws.onerror = () => ws.close()
  }

  function _closeWS() {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    pendingSendsRef.current = []
  }

  function _wsSend(data) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
      return
    }
    pendingSendsRef.current.push(data)
    if (user && token) _openWS()
  }

  // ── Incoming signal handler ────────────────────────────────────────────────
  function _handleSignal(data) {
    switch (data.type) {
      case 'call_offer':
        // Store everything needed to accept later
        pendingRef.current = {
          offer: data.payload,
          toUser: data.from_user,
          callType: data.call_type || 'audio',
          bookingId: data.booking_id,
          bookingNumber: data.booking_number,
        }
        toUserRef.current = data.from_user
        setCallType(data.call_type || 'audio')
        setCallPartnerName(data.from_name || 'Unknown')
        setCallState('incoming')
        ringtone.start()
        ;(data.ice_candidates || []).forEach((candidate) => {
          if (candidate) {
            pendingRef.current.iceCandidates = [
              ...(pendingRef.current.iceCandidates || []),
              candidate,
            ]
          }
        })
        break

      case 'call_answer':
        if (pcRef.current) {
          pcRef.current
            .setRemoteDescription(new RTCSessionDescription(data.payload))
            .then(() => setCallState('active'))
            .catch(() => {})
        }
        break

      case 'ice_candidate':
        if (pcRef.current && data.payload) {
          pcRef.current.addIceCandidate(new RTCIceCandidate(data.payload)).catch(() => {})
        } else if (pendingRef.current && data.payload) {
          pendingRef.current.iceCandidates = [
            ...(pendingRef.current.iceCandidates || []),
            data.payload,
          ]
        }
        break

      case 'call_reject':
        toast('Call rejected', { icon: '📵' })
        _cleanup()
        break

      case 'call_end':
        toast('Call ended', { icon: '📞' })
        _cleanup()
        break

      default: break
    }
  }

  // ── WebRTC helpers ─────────────────────────────────────────────────────────
  function _createPC() {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && toUserRef.current)
        _wsSend({ type: 'ice_candidate', to_user: toUserRef.current, payload: candidate.toJSON() })
    }
    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0])
        remoteVideoRef.current.srcObject = streams[0]
    }
    pcRef.current = pc
    return pc
  }

  async function _getMedia(type) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    return stream
  }

  function _cleanup() {
    ringtone.stop()
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
    toUserRef.current = null
    pendingRef.current = null
    setCallState('idle')
    setIsMuted(false)
    setIsCameraOff(false)
  }

  // ── Public API (used by BookingsPage) ──────────────────────────────────────
  async function startCall(booking, type, toUserId) {
    const partnerName = toUserId === booking?.technician?.user?.id
      ? `${booking.technician.user.first_name} ${booking.technician.user.last_name}`.trim()
      : `${booking?.customer?.user?.first_name} ${booking?.customer?.user?.last_name}`.trim()

    toUserRef.current = String(toUserId)
    setCallType(type)
    setCallPartnerName(partnerName)
    setCallState('outgoing')

    try {
      const stream = await _getMedia(type)
      const pc = _createPC()
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      _wsSend({
        type: 'call_offer',
        to_user: String(toUserId),
        call_type: type,
        booking_id: booking.id,
        booking_number: booking.booking_number,
        payload: { sdp: offer.sdp, type: offer.type },
      })
    } catch {
      toast.error('Could not access microphone/camera')
      _cleanup()
    }
  }

  async function acceptCall() {
    const pending = pendingRef.current
    if (!pending) return
    ringtone.stop()
    setCallState('active')
    try {
      const stream = await _getMedia(pending.callType)
      const pc = _createPC()
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      await pc.setRemoteDescription(new RTCSessionDescription(pending.offer))
      ;(pending.iceCandidates || []).forEach((candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      })
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      _wsSend({
        type: 'call_answer',
        to_user: pending.toUser,
        call_type: pending.callType,
        payload: { sdp: answer.sdp, type: answer.type },
      })
    } catch {
      toast.error('Could not start call')
      _cleanup()
    }
  }

  function rejectCall() {
    const pending = pendingRef.current
    ringtone.stop()
    if (pending?.toUser) _wsSend({ type: 'call_reject', to_user: pending.toUser })
    _cleanup()
  }

  function endCall() {
    if (toUserRef.current) _wsSend({ type: 'call_end', to_user: toUserRef.current })
    _cleanup()
  }

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled })
    setIsMuted((m) => !m)
  }

  function toggleCamera() {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled })
    setIsCameraOff((c) => !c)
  }

  const value = { callState, callType, callPartnerName, startCall }

  return (
    <CallContext.Provider value={value}>
      {children}
      {/* Global call overlay — renders on every page */}
      <BookingCall
        callState={callState}
        callType={callType}
        partnerName={callPartnerName}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
      />
    </CallContext.Provider>
  )
}
