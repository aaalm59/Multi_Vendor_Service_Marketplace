/**
 * useNotificationSocket
 *
 * Opens a WebSocket to ws/notifications/?token=<jwt> and:
 *   - Loads initial notifications via REST on first mount
 *   - Dispatches prependNotification + shows toast on every WS message
 *   - Auto-reconnects (up to 5 times) with exponential back-off
 *   - Closes cleanly on unmount / logout
 */
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { notificationAPI } from '../services/api'
import {
  setNotifications,
  prependNotification,
  resetNotifications,
} from '../redux/notificationSlice'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8001'
const MAX_RETRIES = 5

const TYPE_ICONS = {
  booking_created:     '📋',
  booking_assigned:    '🔧',
  booking_in_progress: '⚙️',
  booking_completed:   '✅',
  booking_cancelled:   '❌',
  invoice_created:     '🧾',
  payment_received:    '💰',
  low_stock:           '⚠️',
  user_created:        '👤',
  permission_changed:  '🔑',
  system:              '🔔',
}

export default function useNotificationSocket() {
  const dispatch  = useDispatch()
  const { token, user } = useSelector((s) => s.auth)
  const { loaded }      = useSelector((s) => s.notifications)
  const wsRef     = useRef(null)
  const retryRef  = useRef(0)
  const timerRef  = useRef(null)

  // ── Load initial notifications from REST ──────────────────────────────────
  useEffect(() => {
    if (!token || !user || loaded) return
    notificationAPI.getAll({ limit: 50 })
      .then((res) => dispatch(setNotifications(res.data?.results || res.data || [])))
      .catch(() => {})
  }, [token, user, loaded, dispatch])

  // ── WebSocket lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !user) {
      dispatch(resetNotifications())
      return
    }

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return

      const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        retryRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type !== 'notification') return

          const notif = {
            id:                data.id,
            title:             data.title,
            message:           data.message,
            notification_type: data.notification_type,
            entity_type:       data.entity_type,
            entity_id:         data.entity_id,
            action_url:        data.action_url,
            is_read:           false,
            created_at:        data.created_at,
            time_ago:          'just now',
          }
          dispatch(prependNotification(notif))

          const icon = TYPE_ICONS[data.notification_type] || '🔔'
          toast(`${icon} ${data.title}`, {
            duration: 5000,
            style: { maxWidth: 360 },
          })
        } catch {}
      }

      ws.onclose = (event) => {
        if (event.code === 4001 || event.code === 1000) return // auth fail or clean close
        if (retryRef.current >= MAX_RETRIES) return
        const delay = Math.min(1000 * 2 ** retryRef.current, 30000)
        retryRef.current += 1
        timerRef.current = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      clearTimeout(timerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent retry on intentional close
        wsRef.current.close(1000)
        wsRef.current = null
      }
    }
  }, [token, user?.id, dispatch])
}
