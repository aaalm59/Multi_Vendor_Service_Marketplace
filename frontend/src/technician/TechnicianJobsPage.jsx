import React, { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  FiMapPin, FiPhone, FiCalendar, FiClock, FiTool,
  FiCheckCircle, FiRefreshCw, FiCamera, FiMessageSquare,
  FiChevronDown, FiChevronUp, FiUser, FiUserCheck, FiZap,
} from 'react-icons/fi'
import { bookingAPI } from '../services/api'
import StatusBadge from '../components/StatusBadge'

const STATUS_OPTIONS = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

// Card for assigned jobs (technician can update status, add notes, upload images)
const AssignedJobCard = ({ booking, onRefresh }) => {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [images, setImages] = useState([])
  const fileRef = useRef()

  const customer = booking.customer?.user || {}
  const service = booking.service

  const loadImages = async () => {
    try {
      const res = await bookingAPI.getRepairImages(booking.id)
      setImages(res.data)
    } catch { /* silent */ }
  }

  useEffect(() => { if (expanded) loadImages() }, [expanded])

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      await bookingAPI.updateStatus(booking.id, newStatus)
      toast.success(`Status updated to "${newStatus}"`)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status')
    } finally { setUpdatingStatus(false) }
  }

  const handleNoteSubmit = async () => {
    if (!note.trim()) return
    setSubmittingNote(true)
    try {
      await bookingAPI.addNote(booking.id, note.trim())
      setNote('')
      toast.success('Note added')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add note')
    } finally { setSubmittingNote(false) }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const fd = new FormData()
    fd.append('image', file)
    try {
      await bookingAPI.uploadRepairImage(booking.id, fd)
      toast.success('Image uploaded')
      loadImages()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally { setUploadingImage(false); e.target.value = '' }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-400 font-bold text-sm">{booking.booking_number}</span>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-white font-semibold truncate">
            {customer.first_name} {customer.last_name}
          </p>
          {customer.phone && (
            <a href={`tel:${customer.phone}`}
              className="flex items-center gap-1.5 text-gray-400 hover:text-yellow-400 text-sm mt-0.5 transition-colors w-fit">
              <FiPhone size={12} />{customer.phone}
            </a>
          )}
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="text-gray-400 hover:text-white p-1 flex-shrink-0">
          {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </button>
      </div>

      {/* Quick info */}
      <div className="px-4 pb-3 flex flex-wrap gap-3 text-xs text-gray-400">
        {service && <span className="flex items-center gap-1"><FiTool size={11} />{service.name}</span>}
        {booking.scheduled_date && <span className="flex items-center gap-1"><FiCalendar size={11} />{booking.scheduled_date}</span>}
        {booking.scheduled_time && <span className="flex items-center gap-1"><FiClock size={11} />{booking.scheduled_time}</span>}
      </div>

      {/* Address */}
      {(booking.service_address || booking.city) && (
        <div className="mx-4 mb-3 px-3 py-2 bg-gray-800 rounded-lg">
          <div className="flex items-start gap-2 text-gray-300 text-sm">
            <FiMapPin size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              {booking.service_address && <p>{booking.service_address}</p>}
              {booking.landmark && <p className="text-gray-400 text-xs">Landmark: {booking.landmark}</p>}
              <p className="text-gray-400 text-xs">{[booking.area, booking.city, booking.pincode].filter(Boolean).join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status buttons */}
      <div className="px-4 pb-3 flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button key={opt.value}
            disabled={booking.status === opt.value || updatingStatus}
            onClick={() => handleStatusChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              booking.status === opt.value
                ? 'bg-yellow-400 text-black cursor-default'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}>
            {opt.value === 'in_progress' && <FiRefreshCw size={11} />}
            {opt.value === 'completed' && <FiCheckCircle size={11} />}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {booking.problem_description && (
            <div>
              <p className="text-gray-500 text-xs uppercase font-bold mb-1">Problem</p>
              <p className="text-gray-300 text-sm">{booking.problem_description}</p>
            </div>
          )}
          {booking.notes && (
            <div>
              <p className="text-gray-500 text-xs uppercase font-bold mb-1">Notes</p>
              <pre className="text-gray-300 text-xs whitespace-pre-wrap font-sans bg-gray-800 rounded p-2">{booking.notes}</pre>
            </div>
          )}
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Add Note</p>
            <div className="flex gap-2">
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Write a note..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none" />
              <button onClick={handleNoteSubmit} disabled={submittingNote || !note.trim()}
                className="px-3 bg-yellow-400 text-black rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center gap-1 self-start">
                <FiMessageSquare size={13} />{submittingNote ? '...' : 'Save'}
              </button>
            </div>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold mb-2">Repair Images</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((img) => (
                <a key={img.id} href={img.image} target="_blank" rel="noreferrer"
                  className="w-16 h-16 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0">
                  <img src={img.image} alt={img.caption || 'repair'} className="w-full h-full object-cover" />
                </a>
              ))}
              {images.length === 0 && <p className="text-gray-500 text-xs">No images yet</p>}
            </div>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleImageUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploadingImage}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors">
              <FiCamera size={14} />{uploadingImage ? 'Uploading...' : 'Upload Photo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Card for available (pending) bookings — technician can self-assign
const AvailableJobCard = ({ booking, onAssign, assigning }) => {
  const customer = booking.customer?.user || {}
  const service = booking.service

  return (
    <div className="bg-gray-900 border border-dashed border-yellow-600 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-400 font-bold text-sm">{booking.booking_number}</span>
              <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full font-medium">Available</span>
            </div>
            <p className="text-white font-semibold truncate">
              {customer.first_name} {customer.last_name}
            </p>
            {customer.phone && (
              <p className="flex items-center gap-1.5 text-gray-400 text-sm mt-0.5">
                <FiPhone size={12} />{customer.phone}
              </p>
            )}
          </div>
          <button
            onClick={() => onAssign(booking.id)}
            disabled={assigning === booking.id}
            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 text-black rounded-lg text-xs font-bold hover:bg-yellow-500 disabled:opacity-60 transition-all flex-shrink-0"
          >
            {assigning === booking.id
              ? <><span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> Assigning...</>
              : <><FiUserCheck size={13} /> Assign To Me</>}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
          {service && <span className="flex items-center gap-1"><FiTool size={11} />{service.name}</span>}
          {booking.scheduled_date && <span className="flex items-center gap-1"><FiCalendar size={11} />{booking.scheduled_date}</span>}
        </div>

        {(booking.service_address || booking.city) && (
          <div className="mt-2 px-3 py-2 bg-gray-800 rounded-lg flex items-start gap-2 text-sm text-gray-300">
            <FiMapPin size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <span>{[booking.service_address, booking.city].filter(Boolean).join(', ')}</span>
          </div>
        )}

        {booking.problem_description && (
          <p className="mt-2 text-xs text-gray-400 line-clamp-2">{booking.problem_description}</p>
        )}
      </div>
    </div>
  )
}

const TechnicianJobsPage = () => {
  const { user } = useSelector((state) => state.auth)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('my_jobs') // 'my_jobs' | 'available'
  const [assigning, setAssigning] = useState(null) // booking id being assigned

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await bookingAPI.getAll()
      setJobs(res.data?.results || res.data || [])
    } catch {
      toast.error('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchJobs() }, [])

  // Split: technician's own jobs vs available (pending, no technician)
  const myJobs = jobs.filter((j) => j.technician && j.technician.user?.id === user?.id)
  const availableJobs = jobs.filter((j) => !j.technician && j.status === 'pending')

  const myJobCounts = {
    all: myJobs.length,
    assigned: myJobs.filter((j) => j.status === 'assigned').length,
    in_progress: myJobs.filter((j) => j.status === 'in_progress').length,
    completed: myJobs.filter((j) => j.status === 'completed').length,
  }

  const [myFilter, setMyFilter] = useState('all')
  const filteredMyJobs = myFilter === 'all' ? myJobs : myJobs.filter((j) => j.status === myFilter)

  const handleSelfAssign = async (bookingId) => {
    setAssigning(bookingId)
    try {
      await bookingAPI.selfAssign(bookingId)
      toast.success('Booking assigned to you!')
      setActiveTab('my_jobs')
      fetchJobs()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign booking')
    } finally {
      setAssigning(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
              <FiTool size={20} className="text-black" />
            </div>
            <div>
              <h1 className="text-gray-900 text-xl font-bold">Technician Dashboard</h1>
              <p className="text-gray-500 text-sm">{user?.first_name} {user?.last_name}</p>
            </div>
          </div>
          <button onClick={fetchJobs} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition">
            <FiRefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('my_jobs')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'my_jobs' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiTool size={14} /> My Jobs
          {myJobs.length > 0 && (
            <span className="bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded-full">{myJobs.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'available' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiZap size={14} /> Available
          {availableJobs.length > 0 && (
            <span className="bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">{availableJobs.length}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading jobs...</div>
      ) : activeTab === 'my_jobs' ? (
        <>
          {/* My jobs filter */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { key: 'all', label: 'Total', color: 'text-gray-900' },
              { key: 'assigned', label: 'New', color: 'text-blue-600' },
              { key: 'in_progress', label: 'Active', color: 'text-yellow-600' },
              { key: 'completed', label: 'Done', color: 'text-green-600' },
            ].map((s) => (
              <button key={s.key} onClick={() => setMyFilter(s.key)}
                className={`bg-white border-2 rounded-xl p-3 text-center transition-all ${
                  myFilter === s.key ? 'border-gray-900 shadow-sm' : 'border-gray-100 hover:border-gray-300'
                }`}>
                <p className={`text-xl font-bold ${s.color}`}>{myJobCounts[s.key]}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>

          {filteredMyJobs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FiTool size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No jobs yet</p>
              <p className="text-sm mt-1">Check the <strong>Available</strong> tab to pick up new bookings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMyJobs.map((job) => (
                <AssignedJobCard key={job.id} booking={job} onRefresh={fetchJobs} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Available tab */
        <>
          <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
            <FiZap size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Available Bookings</p>
              <p className="text-xs text-gray-600 mt-0.5">
                These are unassigned bookings from your shop. Click <strong>Assign To Me</strong> to take one.
              </p>
            </div>
          </div>

          {availableJobs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FiUserCheck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No available bookings</p>
              <p className="text-sm mt-1">All bookings are currently assigned or there are no new ones</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableJobs.map((job) => (
                <AvailableJobCard key={job.id} booking={job} onAssign={handleSelfAssign} assigning={assigning} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TechnicianJobsPage
