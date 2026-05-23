import React, { useEffect, useRef, useState } from 'react'
import { FiCheck, FiPlus, FiUserCheck, FiDownload, FiX, FiXCircle, FiStar, FiCamera, FiUser, FiTool, FiMapPin, FiCalendar, FiFileText, FiImage, FiAlertCircle, FiClock, FiMessageCircle, FiSend, FiPaperclip, FiFile, FiMic, FiMicOff, FiPhone, FiVideo, FiSearch, FiUserPlus, FiCopy } from 'react-icons/fi'
import Cookies from 'js-cookie'
import { useCallContext } from '../context/CallContext'

const SPEECH_KEY = import.meta.env.VITE_SPEECH_KEY
const SPEECH_REGION = import.meta.env.VITE_SPEECH_REGION

const defaultWsBase =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
    : ''
const WS_BASE = (import.meta.env.VITE_WS_URL || defaultWsBase).replace(/^http/, 'ws')
import { useSelector } from 'react-redux'
import { bookingAPI, customerAPI, serviceAPI, shopAPI, technicianAPI, userAPI } from '../services/api'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { canAccess, canDo, roleGroups, ROLES } from '../routes/rbac'
import { downloadCSV } from '../utils/exportCSV'

const Section = ({ icon: Icon, title, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <Icon size={14} className="text-yellow-500 flex-shrink-0" />
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
    </div>
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      {children}
    </div>
  </div>
)

const InfoRow = ({ label, value, highlight }) => (
  <div>
    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
    <p className={`text-sm font-semibold ${highlight ? 'text-emerald-600' : 'text-gray-800'}`}>{value}</p>
  </div>
)

const TimelineItem = ({ color, label, time, detail, children }) => (
  <li className="ml-4 relative">
    <span className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${color}`} />
    <p className="text-sm font-semibold text-gray-800">{label}</p>
    {detail && <p className="text-xs text-gray-500">{detail}</p>}
    {time && <p className="text-xs text-gray-400">{new Date(time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
    {children && <div className="mt-2">{children}</div>}
  </li>
)

const BookingsPage = () => {
  const [bookings, setBookings] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [shops, setShops] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Assign technician modal state
  const [assignModal, setAssignModal] = useState(null) // booking object or null
  const [selectedTechnician, setSelectedTechnician] = useState('')
  const [assigning, setAssigning] = useState(false)
  // Assign modal — enhanced technician list + inline creation
  const [modalTechs, setModalTechs] = useState([])
  const [modalTechsLoading, setModalTechsLoading] = useState(false)
  const [techSearch, setTechSearch] = useState('')
  const [showCreateTech, setShowCreateTech] = useState(false)
  const [newTech, setNewTech] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '', specialization: '', experience_years: '1' })
  const [creatingTech, setCreatingTech] = useState(false)
  const [techCreds, setTechCreds] = useState(null)
  const [showTechPwd, setShowTechPwd] = useState(false)

  // Complete booking modal
  const [completeModal, setCompleteModal] = useState(null)
  const [finalAmount, setFinalAmount] = useState('')
  const [completing, setCompleting] = useState(false)

  // Customer: cancel booking
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelComment, setCancelComment] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Customer: review modal
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Booking detail drawer
  const [detailBooking, setDetailBooking] = useState(null)
  const [detailImages, setDetailImages] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [drawerTab, setDrawerTab] = useState('details')

  // Chat
  const [chatMessages, setChatMessages] = useState([])
  const [chatText, setChatText] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [typingUser, setTypingUser] = useState(null)
  const [chatAttachment, setChatAttachment] = useState(null)
  const [isListening, setIsListening] = useState(false)

  // Call via global CallContext
  const { callState, startCall } = useCallContext()

  const wsRef = useRef(null)
  const typingTimerRef = useRef(null)
  const chatEndRef = useRef(null)
  const chatFileRef = useRef(null)
  const recognizerRef = useRef(null)

  // Problem image ref for customer booking form
  const problemImageRef = useRef(null)

  const { user } = useSelector((state) => state.auth)
  // Role check then dynamic permission check for managers
  const canCreateBooking = canAccess(user, [...roleGroups.management, ROLES.CUSTOMER]) &&
    canDo(user, 'bookings', 'create')
  const canAssignTechnician = canAccess(user, roleGroups.management) &&
    canDo(user, 'bookings', 'manage_bookings')
  const canCompleteBooking = canAccess(user, roleGroups.service)
  const canDeleteBooking = canAccess(user, roleGroups.management) && canDo(user, 'bookings', 'delete')
  const canExport = canAccess(user, roleGroups.management) && canDo(user, 'bookings', 'export_csv')

  const [form, setForm] = useState({
    customer: '',
    shop: '',
    service: '',
    booking_date: new Date().toISOString().slice(0, 16),
    scheduled_date: '',
    scheduled_time: '',
    service_address: '',
    problem_description: '',
    quote_amount: '',
  })

  useEffect(() => {
    fetchBookings()
  }, [search, statusFilter])

  useEffect(() => {
    const loadFormData = async () => {
      try {
        // Customers don't need the customer list (backend auto-assigns them)
        const [customerRes, serviceRes, shopRes] = await Promise.all([
          user?.role !== ROLES.CUSTOMER
            ? customerAPI.getAll({ limit: 100 })
            : Promise.resolve({ data: [] }),
          serviceAPI.getAll({ limit: 100 }),
          user?.role === ROLES.CUSTOMER
            ? shopAPI.getPublic()
            : shopAPI.getAll({ limit: 100 }),
        ])
        if (user?.role !== ROLES.CUSTOMER) {
          setCustomers(customerRes.data?.results || customerRes.data || [])
        }
        setServices(serviceRes.data?.results || serviceRes.data || [])
        setShops(shopRes.data?.results || shopRes.data || [])

        // Pre-populate service_address for customer from their profile
        if (user?.role === ROLES.CUSTOMER) {
          customerAPI.getAll({ limit: 1 }).then((res) => {
            const profile = (res.data?.results || res.data || [])[0]
            if (profile?.address) {
              const parts = [profile.address, profile.city, profile.state, profile.postal_code]
              setForm((prev) => ({
                ...prev,
                service_address: prev.service_address || parts.filter(Boolean).join(', '),
              }))
            }
          }).catch(() => {})
        }

        if (canAssignTechnician) {
          const techRes = await technicianAPI.getAvailable()
          setTechnicians(techRes.data?.results || techRes.data || [])
        }
      } catch {
        toast.error('Could not load form data')
      }
    }
    loadFormData()
  }, [canAssignTechnician, user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset chat state when drawer closes
  useEffect(() => {
    if (!detailBooking) {
      setChatMessages([])
      setChatText('')
      setChatAttachment(null)
      setTypingUser(null)
      setIsListening(false)
      setDrawerTab('details')
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      if (recognizerRef.current) { recognizerRef.current.stopContinuousRecognitionAsync(); recognizerRef.current = null }
    }
  }, [detailBooking])

  // Open WebSocket when chat tab becomes active
  useEffect(() => {
    if (!detailBooking || drawerTab !== 'chat') {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
      setTypingUser(null)
      return
    }

    // Load existing messages via REST first
    bookingAPI.getMessages(detailBooking.id)
      .then((res) => setChatMessages(res.data || []))
      .catch(() => {})

    const token = Cookies.get('access_token') || ''
    const url = `${WS_BASE}/ws/booking/${detailBooking.id}/chat/?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'chat_message') {
          setChatMessages((prev) => {
            if (prev.find((m) => String(m.id) === String(data.id))) return prev
            return [...prev, data]
          })
          setTypingUser(null)
        } else if (data.type === 'typing') {
          setTypingUser(data.is_typing ? data.sender_name : null)
        }
      } catch { /* ignore */ }
    }

    ws.onerror = () => { /* silent — REST fallback already loaded messages */ }
    ws.onclose = () => { if (wsRef.current === ws) wsRef.current = null }

    return () => { ws.close(); wsRef.current = null }
  }, [detailBooking?.id, drawerTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const params = { limit: 50, ordering: '-created_at' }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const response = await bookingAPI.getAll(params)
      setBookings(response.data.results || response.data || [])
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const buildBookingPayload = () => {
    const payload = {
      service: form.service,
      shop: form.shop,
      booking_date: new Date(form.booking_date).toISOString(),
      service_address: form.service_address,
      problem_description: form.problem_description,
    }
    // Only include optional fields when they have a value
    if (form.scheduled_date) payload.scheduled_date = form.scheduled_date
    if (form.scheduled_time) payload.scheduled_time = form.scheduled_time
    if (form.quote_amount)   payload.quote_amount   = form.quote_amount
    if (!payload.shop) delete payload.shop
    // Staff sets customer explicitly; customer role has it auto-assigned by perform_create
    if (user?.role !== ROLES.CUSTOMER && form.customer) payload.customer = form.customer
    return payload
  }

  const handleShopChange = async (shopId) => {
    setForm((prev) => ({ ...prev, shop: shopId, service: '' }))
    if (user?.role !== ROLES.CUSTOMER || !shopId) return
    try {
      const res = await serviceAPI.getAll({ limit: 100, shop: shopId })
      setServices(res.data?.results || res.data || [])
    } catch {
      toast.error('Could not load services for selected shop')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const imageFile = problemImageRef.current?.files?.[0]
      if (imageFile) {
        const fd = new FormData()
        Object.entries(buildBookingPayload()).forEach(([k, v]) => fd.append(k, v))
        fd.append('problem_image', imageFile)
        await bookingAPI.create(fd)
      } else {
        await bookingAPI.create(buildBookingPayload())
      }
      toast.success('Booking created successfully!')
      setShowForm(false)
      if (problemImageRef.current) problemImageRef.current.value = ''
      setForm({
        customer: '', shop: '', service: '',
        booking_date: new Date().toISOString().slice(0, 16),
        scheduled_date: '', scheduled_time: '',
        service_address: '', problem_description: '', quote_amount: '',
      })
      fetchBookings()
    } catch (error) {
      const errData = error.response?.data
      const msg = errData?.detail
        || errData?.service?.[0]
        || errData?.customer?.[0]
        || errData?.booking_date?.[0]
        || errData?.non_field_errors?.[0]
        || 'Booking create failed'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const openAssignModal = async (booking) => {
    setAssignModal(booking)
    setSelectedTechnician('')
    setShowCreateTech(false)
    setNewTech({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '', specialization: '', experience_years: '1' })
    setTechSearch('')
    setTechCreds(null)
    setShowTechPwd(false)
    setModalTechsLoading(true)
    try {
      const res = await technicianAPI.getAll({ limit: 200 })
      const list = res.data?.results || res.data || []
      setModalTechs(list)
      const available = list.filter(t => t.availability_status === 'available')
      if (available.length === 1) setSelectedTechnician(available[0].id)
    } catch {
      toast.error('Could not load technicians')
    } finally {
      setModalTechsLoading(false)
    }
  }

  const handleAssignTechnician = async () => {
    if (!selectedTechnician) { toast.error('Select a technician'); return }
    setAssigning(true)
    try {
      await bookingAPI.assignTechnician(assignModal.id, selectedTechnician)
      const tech = modalTechs.find((t) => t.id === selectedTechnician)
      toast.success(`Assigned to ${tech?.user?.first_name || 'technician'}`)
      setAssignModal(null)
      setTechCreds(null)
      fetchBookings()
    } catch {
      toast.error('Technician assignment failed')
    } finally {
      setAssigning(false)
    }
  }

  const handleCreateTechnician = async () => {
    const { first_name, last_name, email, phone, password, confirm_password, specialization, experience_years } = newTech
    if (!first_name.trim()) { toast.error('First name is required'); return }
    if (!email.trim()) { toast.error('Email is required'); return }
    if (!password || password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm_password) { toast.error('Passwords do not match'); return }
    setCreatingTech(true)
    try {
      const userRes = await userAPI.create({
        first_name: first_name.trim(), last_name: last_name.trim(),
        email: email.trim(), phone: phone.trim(), password, role: 'technician',
      })
      const createdUser = userRes.data
      const techRes = await technicianAPI.create({
        user: createdUser.id,
        specialization: specialization.trim() || 'General',
        experience_years: Number(experience_years) || 1,
        hourly_rate: 0,
        availability_status: 'available',
      })
      const createdTech = techRes.data
      const listRes = await technicianAPI.getAll({ limit: 200 })
      const freshList = listRes.data?.results || listRes.data || []
      setModalTechs(freshList)
      setSelectedTechnician(createdTech.id)
      setTechCreds({
        name: [first_name.trim(), last_name.trim()].filter(Boolean).join(' '),
        email: email.trim(), password,
      })
      setShowCreateTech(false)
      setNewTech({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '', specialization: '', experience_years: '1' })
      toast.success(`Technician "${createdUser.first_name}" created and auto-selected!`)
    } catch (error) {
      const data = error.response?.data
      const msg = data?.email?.[0] || data?.user?.[0] || data?.non_field_errors?.[0] || data?.detail || 'Failed to create technician'
      toast.error(msg)
    } finally {
      setCreatingTech(false)
    }
  }

  const handleSelfAssign = async (booking) => {
    try {
      await bookingAPI.selfAssign(booking.id)
      toast.success('Booking assigned to you!')
      fetchBookings()
    } catch (error) {
      const msg = error.response?.data?.error || 'Could not self-assign booking'
      toast.error(msg)
    }
  }

  const openCompleteModal = (booking) => {
    setCompleteModal(booking)
    setFinalAmount(booking.quote_amount || booking.final_amount || '')
  }

  const handleCompleteBooking = async () => {
    setCompleting(true)
    try {
      await bookingAPI.markCompleted(completeModal.id, finalAmount || completeModal.quote_amount || 0)
      toast.success('Booking marked as completed')
      setCompleteModal(null)
      fetchBookings()
    } catch {
      toast.error('Could not complete booking')
    } finally {
      setCompleting(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!cancelReason) { toast.error('Please select a cancellation reason'); return }
    const fullReason = cancelComment.trim()
      ? `${cancelReason} — ${cancelComment.trim()}`
      : cancelReason
    setCancelling(true)
    try {
      await bookingAPI.cancelBooking(cancelTarget.id, fullReason)
      toast.success('Booking cancelled')
      setCancelTarget(null)
      setCancelReason('')
      setCancelComment('')
      fetchBookings()
    } catch (error) {
      const msg = error.response?.data?.error || 'Could not cancel booking'
      toast.error(msg)
    } finally {
      setCancelling(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewRating) { toast.error('Please select a rating'); return }
    setSubmittingReview(true)
    try {
      await bookingAPI.submitReview(reviewModal.id, reviewRating, reviewText)
      toast.success('Review submitted!')
      setReviewModal(null)
      setReviewRating(0)
      setReviewText('')
      fetchBookings()
    } catch {
      toast.error('Could not submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const openDetail = async (booking) => {
    setDetailBooking(booking)
    setDetailImages([])
    setLoadingDetail(true)
    try {
      const res = await bookingAPI.getRepairImages(booking.id)
      setDetailImages(res.data || [])
    } catch { /* repair images optional */ } finally {
      setLoadingDetail(false)
    }
  }

  const handleSendMessage = (e) => {
    e?.preventDefault()
    const text = chatText.trim()
    if (!text && !chatAttachment) return

    // Stop typing indicator
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: 'typing', is_typing: false }))

    if (chatAttachment) {
      // File upload → REST (WS can't send binary), server broadcasts via channel layer
      setSendingChat(true)
      const fd = new FormData()
      if (text) fd.append('message', text)
      fd.append('attachment', chatAttachment.file)
      fd.append('attachment_name', chatAttachment.name)
      bookingAPI.sendMessage(detailBooking.id, fd)
        .then((res) => {
          setChatMessages((prev) =>
            prev.find((m) => String(m.id) === String(res.data.id)) ? prev : [...prev, res.data]
          )
          setChatText('')
          setChatAttachment(null)
          if (chatFileRef.current) chatFileRef.current.value = ''
        })
        .catch(() => toast.error('Failed to send attachment'))
        .finally(() => setSendingChat(false))
    } else if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat_message', message: text }))
      setChatText('')
    } else {
      // REST fallback for text when WS is disconnected
      setSendingChat(true)
      bookingAPI.sendMessage(detailBooking.id, { message: text })
        .then((res) => { setChatMessages((prev) => [...prev, res.data]); setChatText('') })
        .catch(() => toast.error('Failed to send message'))
        .finally(() => setSendingChat(false))
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const preview = isImage ? URL.createObjectURL(file) : null
    setChatAttachment({ file, preview, name: file.name, isImage })
  }

  const toggleMic = async () => {
    if (isListening) {
      recognizerRef.current?.stopContinuousRecognitionAsync()
      setIsListening(false)
      return
    }
    if (!SPEECH_KEY || !SPEECH_REGION) {
      toast.error('Speech credentials not configured')
      return
    }
    try {
      const { SpeechConfig, AudioConfig, SpeechRecognizer } =
        await import('microsoft-cognitiveservices-speech-sdk')
      const speechConfig = SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION)
      speechConfig.speechRecognitionLanguage = 'hi-IN' // Hindi + English (code-switch)
      const audioConfig = AudioConfig.fromDefaultMicrophoneInput()
      const recognizer = new SpeechRecognizer(speechConfig, audioConfig)
      recognizerRef.current = recognizer

      recognizer.recognizing = (_, e) => {
        // Show interim text in input while speaking
        if (e.result.text) setChatText((prev) => {
          const base = prev.replace(/​.*$/, '')
          return base + '​' + e.result.text
        })
      }
      recognizer.recognized = (_, e) => {
        if (e.result.text) setChatText((prev) => {
          const base = prev.replace(/​.*$/, '').trimEnd()
          return (base ? base + ' ' : '') + e.result.text
        })
      }
      recognizer.canceled = () => { setIsListening(false) }
      recognizer.sessionStopped = () => { setIsListening(false) }

      recognizer.startContinuousRecognitionAsync(
        () => setIsListening(true),
        (err) => { toast.error('Mic error: ' + err); setIsListening(false) }
      )
    } catch {
      toast.error('Speech SDK failed to load')
    }
  }

  const handleChatTyping = (value) => {
    setChatText(value)
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'typing', is_typing: true }))
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'typing', is_typing: false }))
    }, 1500)
  }

  const getChatCallRecipientUserId = (booking) => {
    const technicianUserId = booking?.technician?.user?.id
    const customerUserId = booking?.customer?.user?.id
    if (!technicianUserId || !customerUserId) return null
    return String(user?.id) === String(technicianUserId) ? customerUserId : technicianUserId
  }

  const handleStartChatCall = (type) => {
    const toUserId = getChatCallRecipientUserId(detailBooking)
    if (!toUserId) {
      toast.error('No call recipient available for this booking')
      return
    }
    startCall(detailBooking, type, toUserId)
  }

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const columns = [
    { key: 'booking_number', label: 'Booking #' },
    { key: 'shop_name', label: 'Shop', render: (row) => row.shop_name || '-' },
    { key: 'customer', label: 'Customer', render: (row) => `${row.customer?.user?.first_name || ''} ${row.customer?.user?.last_name || ''}`.trim() || '-' },
    { key: 'service', label: 'Service', render: (row) => row.service?.name || '-' },
    {
      key: 'technician',
      label: 'Technician',
      render: (row) => row.technician ? (
        <div>
          <p className="font-medium text-gray-800">{`${row.technician.user?.first_name || ''} ${row.technician.user?.last_name || ''}`.trim()}</p>
          {row.technician.user?.phone && (
            <p className="text-xs text-gray-400 mt-0.5">{row.technician.user.phone}</p>
          )}
        </div>
      ) : <span className="text-gray-400 text-xs">Unassigned</span>
    },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
    { key: 'amount', label: 'Amount', render: (row) => `₹${Number(row.final_amount || row.quote_amount || 0).toLocaleString('en-IN')}` },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {/* Staff: assign technician */}
          {canAssignTechnician && !row.technician && row.status !== 'completed' && row.status !== 'cancelled' && (
            <button onClick={() => openAssignModal(row)} className="rounded-lg bg-sky-50 p-2 text-sky-700 hover:bg-sky-100 transition" title="Assign technician">
              <FiUserCheck size={15} />
            </button>
          )}
          {/* Technician: self-assign pending bookings */}
          {user?.role === ROLES.TECHNICIAN && !row.technician && row.status === 'pending' && (
            <button
              onClick={() => handleSelfAssign(row)}
              className="rounded-lg bg-yellow-50 p-2 text-yellow-700 hover:bg-yellow-100 transition"
              title="Assign to me"
            >
              <FiUser size={15} />
            </button>
          )}
          {/* Staff: mark complete */}
          {canCompleteBooking && row.status !== 'completed' && row.status !== 'cancelled' && (
            <button onClick={() => openCompleteModal(row)} className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 transition" title="Complete booking">
              <FiCheck size={15} />
            </button>
          )}
          {/* Customer: cancel booking */}
          {user?.role === ROLES.CUSTOMER && ['pending', 'assigned'].includes(row.status) && (
            <button
              onClick={() => setCancelTarget(row)}
              className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 transition"
              title="Cancel booking"
            >
              <FiXCircle size={15} />
            </button>
          )}
          {/* Customer: submit review */}
          {user?.role === ROLES.CUSTOMER && row.status === 'completed' && !row.rating && (
            <button
              onClick={() => { setReviewModal(row); setReviewRating(0); setReviewText('') }}
              className="rounded-lg bg-yellow-50 p-2 text-yellow-600 hover:bg-yellow-100 transition"
              title="Leave a review"
            >
              <FiStar size={15} />
            </button>
          )}
          {/* Show rating badge if already reviewed */}
          {user?.role === ROLES.CUSTOMER && row.status === 'completed' && row.rating && (
            <span className="flex items-center gap-0.5 text-xs text-yellow-600 font-bold px-2 py-1 bg-yellow-50 rounded-lg">
              {row.rating}★
            </span>
          )}
        </div>
      ),
    },
  ]

  const handleExport = () => {
    downloadCSV(bookings, [
      { key: 'booking_number', label: 'Booking #' },
      { key: 'customer', label: 'Customer', getValue: (r) => `${r.customer?.user?.first_name || ''} ${r.customer?.user?.last_name || ''}`.trim() },
      { key: 'service', label: 'Service', getValue: (r) => r.service?.name || '' },
      { key: 'technician', label: 'Technician', getValue: (r) => `${r.technician?.user?.first_name || ''} ${r.technician?.user?.last_name || ''}`.trim() || 'Unassigned' },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Amount', getValue: (r) => r.final_amount || r.quote_amount || 0 },
    ], 'bookings')
    toast.success('Bookings CSV downloaded')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar
          title={user?.role === ROLES.CUSTOMER ? 'My Bookings' : 'Service Bookings'}
          subtitle={user?.role === ROLES.CUSTOMER ? 'Your service booking history.' : 'Create bookings, assign technicians, and complete service jobs.'}
          search={search}
          onSearch={setSearch}
          actionLabel={canCreateBooking ? 'New Booking' : undefined}
          actionIcon={FiPlus}
          onAction={() => setShowForm(true)}
        />
        {canExport && (
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            <FiDownload size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              statusFilter === opt.value
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={bookings} loading={loading} emptyMessage="No bookings found" onRowClick={openDetail} />

      {/* New Booking Modal */}
      <Modal title="New Service Booking" open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {user?.role !== ROLES.CUSTOMER && (
            <FormField label="Customer">
              <select className={inputClass} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} required>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.user?.first_name} {c.user?.last_name} — {c.city}</option>
                ))}
              </select>
            </FormField>
          )}
          {(user?.role === ROLES.CUSTOMER || user?.role === ROLES.ADMIN) && (
            <FormField label="Shop">
              <select className={inputClass} value={form.shop} onChange={(e) => handleShopChange(e.target.value)} required={user?.role === ROLES.CUSTOMER || user?.role === ROLES.ADMIN}>
                <option value="">Select shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}{shop.city ? ` — ${shop.city}` : ''}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="Service">
            <select className={inputClass} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required>
              <option value="">Select service</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} — ₹{s.base_price}</option>)}
            </select>
          </FormField>
          <FormField label="Booking Date">
            <input className={inputClass} type="datetime-local" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} required />
          </FormField>
          <FormField label="Scheduled Date">
            <input className={inputClass} type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
          </FormField>
          <FormField label="Scheduled Time">
            <input className={inputClass} type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} />
          </FormField>
          <FormField label="Quote Amount (₹)">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.quote_amount} onChange={(e) => setForm({ ...form, quote_amount: e.target.value })} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Service Address">
              <textarea className={inputClass} rows={2} value={form.service_address} onChange={(e) => setForm({ ...form, service_address: e.target.value })} required />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Problem Description">
              <textarea className={inputClass} rows={3} value={form.problem_description} onChange={(e) => setForm({ ...form, problem_description: e.target.value })} required />
            </FormField>
          </div>
          {/* Problem Image (optional) */}
          <div className="md:col-span-2">
            <FormField label="Problem Photo (Optional)">
              <label className="flex items-center gap-3 cursor-pointer w-full px-3 py-2.5 border border-dashed border-gray-300 rounded-lg hover:border-yellow-400 transition bg-gray-50">
                <FiCamera size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500 truncate flex-1">
                  {problemImageRef.current?.files?.[0]?.name || 'Click to attach a photo of the problem'}
                </span>
                <input ref={problemImageRef} type="file" accept="image/*" className="hidden" onChange={() => setForm({ ...form })} />
              </label>
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition flex items-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Booking...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Technician Modal — Enhanced */}
      <Modal
        title="Assign Technician"
        open={!!assignModal}
        onClose={() => { setAssignModal(null); setTechCreds(null) }}
        width="max-w-lg"
      >
        {assignModal && (
          <div className="space-y-4">

            {/* Booking info card */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-sm font-bold text-gray-800">{assignModal.booking_number}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {assignModal.service?.name}
                {assignModal.customer?.user?.first_name && ` · ${assignModal.customer.user.first_name} ${assignModal.customer.user.last_name || ''}`}
              </p>
            </div>

            {/* Credentials card — shown after inline creation */}
            {techCreds && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <FiCheck size={11} className="text-white" />
                  </div>
                  <p className="text-sm font-bold text-green-800">Technician Created & Auto-Selected</p>
                </div>
                <div className="space-y-1.5 text-sm">
                  {[
                    { label: 'Name', value: techCreds.name },
                    { label: 'Email / Username', value: techCreds.email },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="font-semibold text-gray-800 text-xs">{value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100">
                    <span className="text-xs text-gray-400">Password</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-gray-800 text-xs">
                        {showTechPwd ? techCreds.password : '••••••••'}
                      </span>
                      <button onClick={() => setShowTechPwd(v => !v)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                        {showTechPwd ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Name: ${techCreds.name}\nEmail: ${techCreds.email}\nPassword: ${techCreds.password}`)
                    toast.success('Credentials copied to clipboard!')
                  }}
                  className="mt-3 w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <FiCopy size={12} /> Copy All Credentials
                </button>
              </div>
            )}

            {/* Inline create technician form */}
            {showCreateTech && (
              <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 space-y-3">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FiUserPlus size={14} className="text-yellow-600" /> Create New Technician
                </p>
                <p className="text-xs text-gray-500 -mt-1">Will be auto-assigned to the current shop with technician role.</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                    <input className={inputClass} placeholder="First name" value={newTech.first_name} onChange={(e) => setNewTech(p => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                    <input className={inputClass} placeholder="Last name" value={newTech.last_name} onChange={(e) => setNewTech(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                    <input className={inputClass} type="email" placeholder="email@example.com" value={newTech.email} onChange={(e) => setNewTech(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile Number</label>
                    <input className={inputClass} type="tel" placeholder="Phone number" value={newTech.phone} onChange={(e) => setNewTech(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Password *</label>
                    <input className={inputClass} type="password" placeholder="Min 8 characters" value={newTech.password} onChange={(e) => setNewTech(p => ({ ...p, password: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm Password *</label>
                    <input className={inputClass} type="password" placeholder="Repeat password" value={newTech.confirm_password} onChange={(e) => setNewTech(p => ({ ...p, confirm_password: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Specialization</label>
                    <input className={inputClass} placeholder="e.g. AC Repair, Wiring" value={newTech.specialization} onChange={(e) => setNewTech(p => ({ ...p, specialization: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Experience (years)</label>
                    <input className={inputClass} type="number" min="0" placeholder="Years of experience" value={newTech.experience_years} onChange={(e) => setNewTech(p => ({ ...p, experience_years: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTech(false)
                      setNewTech({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '', specialization: '', experience_years: '1' })
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateTechnician}
                    disabled={creatingTech}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:opacity-60 transition"
                  >
                    {creatingTech
                      ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                      : <><FiCheck size={13} /> Create &amp; Select</>}
                  </button>
                </div>
              </div>
            )}

            {/* Technician list — shown when not in create mode */}
            {!showCreateTech && (
              <>
                {modalTechsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : modalTechs.length === 0 ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
                    <FiTool size={32} className="mx-auto mb-2 text-amber-400 opacity-50" />
                    <p className="text-sm font-bold text-amber-800 mb-1">No technicians in this shop yet</p>
                    <p className="text-xs text-amber-600 mb-4">Create a technician and they'll be auto-assigned to this booking.</p>
                    <button
                      onClick={() => setShowCreateTech(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black text-sm font-bold rounded-xl transition mx-auto"
                    >
                      <FiUserPlus size={15} /> Create New Technician
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Search bar */}
                    <div className="relative">
                      <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={techSearch}
                        onChange={(e) => setTechSearch(e.target.value)}
                        placeholder="Search by name or specialization…"
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>

                    {/* Technician cards */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Select Technician</p>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                        {(() => {
                          const filtered = modalTechs.filter(t => {
                            if (!techSearch.trim()) return true
                            const name = `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.toLowerCase()
                            return name.includes(techSearch.toLowerCase()) ||
                              (t.specialization || '').toLowerCase().includes(techSearch.toLowerCase())
                          })
                          if (filtered.length === 0) return (
                            <p className="text-sm text-gray-400 text-center py-4">No match for "{techSearch}"</p>
                          )
                          return filtered.map((tech) => (
                            <label
                              key={tech.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                selectedTechnician === tech.id
                                  ? 'border-yellow-400 bg-yellow-50'
                                  : 'border-gray-200 hover:border-yellow-300 bg-white'
                              }`}
                            >
                              <input
                                type="radio"
                                name="tech"
                                value={tech.id}
                                checked={selectedTechnician === tech.id}
                                onChange={() => setSelectedTechnician(tech.id)}
                                className="accent-yellow-400 flex-shrink-0"
                              />
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs flex-shrink-0">
                                {(tech.user?.first_name?.[0] || 'T').toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {[tech.user?.first_name, tech.user?.last_name].filter(Boolean).join(' ') || tech.user?.email}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {tech.specialization || 'General'} · {tech.experience_years} yrs · ₹{tech.hourly_rate}/hr
                                </p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                                tech.availability_status === 'available' ? 'bg-green-100 text-green-700' :
                                tech.availability_status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {tech.availability_status}
                              </span>
                            </label>
                          ))
                        })()}
                      </div>
                    </div>

                    {/* Create new technician CTA */}
                    <button
                      onClick={() => setShowCreateTech(true)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-yellow-400 hover:bg-yellow-50/50 text-gray-500 hover:text-yellow-700 text-sm font-semibold rounded-xl transition"
                    >
                      <FiUserPlus size={14} /> Create New Technician
                    </button>
                  </>
                )}

                {/* Footer */}
                {modalTechs.length > 0 && (
                  <div className="flex justify-end gap-3 border-t pt-4">
                    <button
                      onClick={() => { setAssignModal(null); setTechCreds(null) }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssignTechnician}
                      disabled={assigning || !selectedTechnician}
                      className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition flex items-center gap-2"
                    >
                      {assigning
                        ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        : <FiUserCheck size={16} />}
                      {assigning ? 'Assigning...' : 'Assign Technician'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Complete Booking Modal */}
      <Modal title="Complete Booking" open={!!completeModal} onClose={() => setCompleteModal(null)} width="max-w-md">
        {completeModal && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-800">{completeModal.booking_number}</p>
              <p className="text-xs text-gray-500 mt-1">{completeModal.service?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Final Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={finalAmount}
                onChange={(e) => setFinalAmount(e.target.value)}
                placeholder={completeModal.quote_amount || '0'}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
              />
              {completeModal.quote_amount && (
                <p className="mt-1 text-xs text-gray-400">Quote was ₹{completeModal.quote_amount}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setCompleteModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleCompleteBooking}
                disabled={completing}
                className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-60 hover:bg-emerald-600 transition flex items-center gap-2"
              >
                {completing ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck size={16} />}
                {completing ? 'Completing...' : 'Mark Completed'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        title="Cancel Booking"
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelReason(''); setCancelComment('') }}
        width="max-w-md"
      >
        {cancelTarget && (
          <div className="space-y-4">
            {/* Booking info */}
            <div className="rounded-lg bg-red-50 border border-red-100 p-3">
              <p className="text-sm font-semibold text-gray-800">{cancelTarget.booking_number}</p>
              <p className="text-xs text-gray-500 mt-0.5">{cancelTarget.service?.name}</p>
            </div>

            {/* Reason dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-gray-50"
              >
                <option value="">— Select a reason —</option>
                <option value="Changed my mind">Changed my mind</option>
                <option value="Found another provider">Found another provider</option>
                <option value="Issue resolved on my own">Issue resolved on my own</option>
                <option value="Technician not available">Technician not available</option>
                <option value="Price concerns">Price concerns</option>
                <option value="Wrong service selected">Wrong service selected</option>
                <option value="Scheduled time not convenient">Scheduled time not convenient</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Optional comment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Additional Comments <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={cancelComment}
                onChange={(e) => setCancelComment(e.target.value)}
                placeholder="Tell us more about your cancellation…"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-gray-50 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                onClick={() => { setCancelTarget(null); setCancelReason(''); setCancelComment('') }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling || !cancelReason}
                className="rounded-lg bg-red-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-60 hover:bg-red-600 transition flex items-center gap-2"
              >
                {cancelling && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {cancelling ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Booking Detail Drawer ─────────────────────────────────── */}
      {detailBooking && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40" onClick={() => setDetailBooking(null)} />
          {/* Panel */}
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-black text-white flex-shrink-0">
              <div>
                <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">Booking Details</p>
                <p className="text-lg font-bold mt-0.5">{detailBooking.booking_number}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge value={detailBooking.status} />
                <button onClick={() => setDetailBooking(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
              <button
                onClick={() => setDrawerTab('details')}
                className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${drawerTab === 'details' ? 'border-yellow-400 text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                <FiFileText size={14} /> Details
              </button>
              <button
                onClick={() => setDrawerTab('chat')}
                className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${drawerTab === 'chat' ? 'border-yellow-400 text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                <FiMessageCircle size={14} /> Chat
              </button>
            </div>

            {/* ── CHAT TAB ── */}
            {drawerTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Participant info + call buttons */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                  <span className="font-semibold text-gray-700 truncate">
                    {detailBooking.customer?.user?.first_name} {detailBooking.customer?.user?.last_name}
                  </span>
                  <span className="text-gray-300">↔</span>
                  <span className="font-semibold text-gray-700 truncate flex-1">
                    {detailBooking.technician
                      ? `${detailBooking.technician.user?.first_name} ${detailBooking.technician.user?.last_name}`
                      : 'No technician assigned'}
                  </span>
                  {/* Call buttons — only when a technician is assigned */}
                  {detailBooking.technician && callState === 'idle' && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleStartChatCall('audio')}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                        title="Audio call"
                      >
                        <FiPhone size={14} />
                      </button>
                      <button
                        onClick={() => handleStartChatCall('video')}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                        title="Video call"
                      >
                        <FiVideo size={14} />
                      </button>
                    </div>
                  )}
                  {callState !== 'idle' && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-semibold animate-pulse">
                      <FiPhone size={12} /> {callState === 'active' ? 'In call' : callState}
                    </span>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <FiMessageCircle size={36} className="text-gray-200 mb-3" />
                      <p className="text-sm text-gray-400">No messages yet</p>
                      <p className="text-xs text-gray-300 mt-1">Start the conversation below</p>
                    </div>
                  )}
                  {chatMessages.map((msg) => {
                    const isMe = String(msg.sender) === String(user?.id)
                    const attName = msg.attachment_name || (msg.attachment ? msg.attachment.split('/').pop() : '')
                    const isImg = msg.attachment && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(attName)
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && (
                            <p className="text-xs font-semibold text-gray-500 mb-0.5 px-1">
                              {msg.sender_name}
                              <span className="ml-1 text-gray-300 font-normal capitalize">({msg.sender_role})</span>
                            </p>
                          )}
                          <div className={`rounded-2xl overflow-hidden ${isMe ? 'bg-yellow-400 text-black rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                            {/* Image attachment */}
                            {isImg && (
                              <a href={msg.attachment} target="_blank" rel="noopener noreferrer">
                                <img src={msg.attachment} alt={attName} className="max-w-[220px] max-h-60 object-cover" />
                              </a>
                            )}
                            {/* Non-image file attachment */}
                            {msg.attachment && !isImg && (
                              <a
                                href={msg.attachment}
                                download={attName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-3 py-2 ${isMe ? 'text-black' : 'text-gray-700'}`}
                              >
                                <FiFile size={18} className="flex-shrink-0" />
                                <span className="text-xs font-medium truncate max-w-[160px]">{attName}</span>
                                <FiDownload size={13} className="flex-shrink-0 opacity-60" />
                              </a>
                            )}
                            {/* Text */}
                            {msg.message && (
                              <p className="text-sm leading-relaxed px-3.5 py-2.5">{msg.message}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 px-1">
                            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            {' · '}{new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}

                  {/* Typing indicator */}
                  {typingUser && (
                    <div className="flex justify-start">
                      <div className="flex flex-col items-start max-w-[78%]">
                        <p className="text-xs font-semibold text-gray-500 mb-0.5 px-1">{typingUser}</p>
                        <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full" style={{animation:'bounce 1.2s infinite', animationDelay:'0ms'}} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full" style={{animation:'bounce 1.2s infinite', animationDelay:'200ms'}} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full" style={{animation:'bounce 1.2s infinite', animationDelay:'400ms'}} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Attachment preview bar */}
                {chatAttachment && (
                  <div className="px-3 py-2 border-t border-gray-100 bg-yellow-50 flex items-center gap-2 flex-shrink-0">
                    {chatAttachment.isImage ? (
                      <img src={chatAttachment.preview} alt="preview" className="h-10 w-10 object-cover rounded-lg border border-yellow-200 flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <FiFile size={18} className="text-yellow-600" />
                      </div>
                    )}
                    <p className="text-xs text-gray-700 flex-1 truncate">{chatAttachment.name}</p>
                    <button
                      onClick={() => { setChatAttachment(null); if (chatFileRef.current) chatFileRef.current.value = '' }}
                      className="p-1 text-gray-400 hover:text-red-500 transition flex-shrink-0"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                )}

                {/* Input */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white flex-shrink-0">
                  {/* Hidden file input */}
                  <input ref={chatFileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={handleFileSelect} />
                  <button
                    type="button"
                    onClick={() => chatFileRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-yellow-500 transition flex-shrink-0"
                    title="Attach file"
                  >
                    <FiPaperclip size={18} />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={chatText.replace(/​.*$/, '')}
                      onChange={(e) => handleChatTyping(e.target.value)}
                      placeholder={chatAttachment ? 'Add a caption…' : 'Type a message…'}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50 pr-9 ${isListening ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                    />
                    {/* Mic button inside input */}
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-yellow-500'}`}
                      title={isListening ? 'Stop listening' : 'Voice input'}
                    >
                      {isListening ? <FiMicOff size={15} /> : <FiMic size={15} />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={sendingChat || (!chatText.trim() && !chatAttachment)}
                    className="p-2.5 bg-yellow-400 text-black rounded-xl hover:bg-yellow-500 disabled:opacity-50 transition flex-shrink-0"
                  >
                    {sendingChat
                      ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin block" />
                      : <FiSend size={16} />
                    }
                  </button>
                </form>
              </div>
            )}

            {/* ── DETAILS TAB ── */}
            {drawerTab === 'details' && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── Customer Card ── */}
              <Section icon={FiUser} title="Customer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-black text-sm flex-shrink-0">
                    {(detailBooking.customer?.user?.first_name?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-semibold text-gray-900">
                      {detailBooking.customer?.user?.first_name} {detailBooking.customer?.user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{detailBooking.customer?.user?.email}</p>
                    <p className="text-xs text-gray-500">{detailBooking.customer?.user?.phone}</p>
                    {detailBooking.customer?.city && (
                      <p className="text-xs text-gray-400">{detailBooking.customer?.city}, {detailBooking.customer?.state}</p>
                    )}
                  </div>
                </div>
              </Section>

              {/* ── Service & Schedule ── */}
              <Section icon={FiCalendar} title="Service & Schedule">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Service" value={detailBooking.service?.name || '—'} />
                  <InfoRow label="Base Price" value={detailBooking.service?.base_price ? `₹${Number(detailBooking.service.base_price).toLocaleString('en-IN')}` : '—'} />
                  <InfoRow label="Booking Date" value={detailBooking.booking_date ? new Date(detailBooking.booking_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'} />
                  <InfoRow label="Scheduled" value={detailBooking.scheduled_date ? `${detailBooking.scheduled_date}${detailBooking.scheduled_time ? ' at ' + detailBooking.scheduled_time : ''}` : '—'} />
                  {detailBooking.completion_date && (
                    <InfoRow label="Completed On" value={new Date(detailBooking.completion_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} />
                  )}
                </div>
              </Section>

              {/* ── Technician ── */}
              <Section icon={FiTool} title="Technician">
                {detailBooking.technician ? (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center font-bold text-sky-700 text-sm flex-shrink-0">
                      {(detailBooking.technician.user?.first_name?.[0] || 'T').toUpperCase()}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-gray-900">
                        {detailBooking.technician.user?.first_name} {detailBooking.technician.user?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{detailBooking.technician.specialization}</p>
                      <p className="text-xs text-gray-400">{detailBooking.technician.experience_years} yrs exp · ₹{detailBooking.technician.hourly_rate}/hr</p>
                      <p className="text-xs text-gray-500">{detailBooking.technician.user?.phone}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No technician assigned yet</p>
                )}
              </Section>

              {/* ── Service Address ── */}
              <Section icon={FiMapPin} title="Service Address">
                <p className="text-sm text-gray-700 leading-relaxed">{detailBooking.service_address}</p>
                {(detailBooking.landmark || detailBooking.area || detailBooking.city) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {[detailBooking.landmark, detailBooking.area, detailBooking.city, detailBooking.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
              </Section>

              {/* ── Problem ── */}
              <Section icon={FiAlertCircle} title="Problem Description">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{detailBooking.problem_description || '—'}</p>
                {detailBooking.problem_image && (
                  <a href={detailBooking.problem_image} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                    <img src={detailBooking.problem_image} alt="Problem" className="rounded-lg max-h-40 object-cover border border-gray-200" />
                  </a>
                )}
              </Section>

              {/* ── Financials ── */}
              <Section icon={FiFileText} title="Financials">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Quote Amount" value={detailBooking.quote_amount ? `₹${Number(detailBooking.quote_amount).toLocaleString('en-IN')}` : '—'} />
                  <InfoRow
                    label="Final Amount"
                    value={detailBooking.final_amount ? `₹${Number(detailBooking.final_amount).toLocaleString('en-IN')}` : '—'}
                    highlight={!!detailBooking.final_amount}
                  />
                </div>
              </Section>


              {/* ── Cancellation ── */}
              {detailBooking.status === 'cancelled' && detailBooking.cancellation_reason && (
                <Section icon={FiXCircle} title="Cancellation Reason">
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                    <p className="text-sm text-red-700">{detailBooking.cancellation_reason}</p>
                  </div>
                </Section>
              )}

              {/* ── Rating & Review ── */}
              {detailBooking.rating && (
                <Section icon={FiStar} title="Customer Review">
                  <div className="flex items-center gap-1 mb-1">
                    {[1,2,3,4,5].map((s) => (
                      <span key={s} className={`text-xl ${s <= detailBooking.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                    ))}
                    <span className="ml-2 text-sm font-semibold text-gray-700">
                      {['','Poor','Fair','Good','Very Good','Excellent'][detailBooking.rating]}
                    </span>
                  </div>
                  {detailBooking.review && (
                    <p className="text-sm text-gray-600 italic">"{detailBooking.review}"</p>
                  )}
                </Section>
              )}


              {/* ── Activity Timeline ── */}
              <Section icon={FiClock} title="Activity Timeline">
                <ol className="relative border-l-2 border-gray-100 ml-2 space-y-4">
                  <TimelineItem
                    color="bg-gray-400"
                    label="Booking Created"
                    time={detailBooking.created_at}
                    detail={`By ${detailBooking.customer?.user?.first_name} ${detailBooking.customer?.user?.last_name}`}
                  />
                  {['assigned','in_progress','completed','cancelled'].includes(detailBooking.status) && (
                    <TimelineItem color="bg-sky-400" label="Technician Assigned" detail={detailBooking.technician ? `${detailBooking.technician.user?.first_name} ${detailBooking.technician.user?.last_name}` : '—'} />
                  )}
                  {['in_progress','completed'].includes(detailBooking.status) && (
                    <TimelineItem color="bg-yellow-400" label="Work In Progress" detail="Technician started the job" />
                  )}
                  {detailBooking.status === 'completed' && (
                    <TimelineItem
                      color="bg-emerald-400"
                      label="Service Completed"
                      time={detailBooking.completion_date}
                      detail={detailBooking.final_amount ? `Final: ₹${Number(detailBooking.final_amount).toLocaleString('en-IN')}` : ''}
                    >
                      {/* Repair photos — optional */}
                      {loadingDetail && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[1,2,3].map((i) => <div key={i} className="h-20 rounded-lg bg-gray-200 animate-pulse" />)}
                        </div>
                      )}
                      {!loadingDetail && detailImages.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1">
                            <FiImage size={11} /> Work Photos
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {detailImages.map((img) => (
                              <a key={img.id} href={img.image} target="_blank" rel="noopener noreferrer">
                                <img src={img.image} alt={img.caption || 'Repair'} className="h-20 w-full object-cover rounded-lg border border-gray-200 hover:opacity-80 transition" />
                                {img.caption && <p className="text-xs text-gray-400 mt-0.5 truncate">{img.caption}</p>}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Technician notes — optional */}
                      {detailBooking.notes && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1">
                            <FiFileText size={11} /> Technician Notes
                          </p>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-white rounded-lg p-2.5 border border-gray-100">
                            {detailBooking.notes}
                          </pre>
                        </div>
                      )}
                    </TimelineItem>
                  )}
                  {detailBooking.status === 'cancelled' && (
                    <TimelineItem
                      color="bg-red-400"
                      label="Booking Cancelled"
                      detail={[
                        `${detailBooking.customer?.user?.first_name || ''} ${detailBooking.customer?.user?.last_name || ''}`.trim(),
                        detailBooking.customer?.user?.phone,
                        detailBooking.cancellation_reason,
                      ].filter(Boolean).join(' · ')}
                    />
                  )}
                </ol>
              </Section>

            </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      <Modal title="Rate Your Service" open={!!reviewModal} onClose={() => setReviewModal(null)} width="max-w-md">
        {reviewModal && (
          <div className="space-y-5">
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <p className="text-sm font-semibold text-gray-800">{reviewModal.booking_number}</p>
              <p className="text-xs text-gray-500 mt-0.5">{reviewModal.service?.name}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">How was your experience?</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`text-3xl transition-transform hover:scale-110 ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-200'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {reviewRating > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {['','Poor','Fair','Good','Very Good','Excellent'][reviewRating]}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comments (Optional)</label>
              <textarea
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your feedback about the service..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setReviewModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || !reviewRating}
                className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition flex items-center gap-2"
              >
                {submittingReview && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default BookingsPage
