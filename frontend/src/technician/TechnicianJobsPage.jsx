import React, { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  FiMapPin, FiPhone, FiCalendar, FiClock, FiTool,
  FiCheckCircle, FiRefreshCw, FiCamera, FiMessageSquare,
  FiChevronDown, FiChevronUp, FiUser,
} from 'react-icons/fi'
import { bookingAPI } from '../services/api'
import StatusBadge from '../components/StatusBadge'

const STATUS_OPTIONS = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

const JobCard = ({ booking, onRefresh }) => {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [images, setImages] = useState([])
  const fileRef = useRef()

  const customer = booking.customer?.user || {}
  const service = booking.service
  const tech = booking.technician

  const loadImages = async () => {
    try {
      const res = await bookingAPI.getRepairImages(booking.id)
      setImages(res.data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (expanded) loadImages()
  }, [expanded])

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      await bookingAPI.updateStatus(booking.id, newStatus)
      toast.success(`Status updated to "${newStatus}"`)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
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
    } finally {
      setSubmittingNote(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const formData = new FormData()
    formData.append('image', file)
    try {
      await bookingAPI.uploadRepairImage(booking.id, formData)
      toast.success('Image uploaded')
      loadImages()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
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
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-1.5 text-gray-400 hover:text-yellow-400 text-sm mt-0.5 transition-colors w-fit"
            >
              <FiPhone size={12} />
              {customer.phone}
            </a>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-400 hover:text-white p-1 flex-shrink-0"
        >
          {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </button>
      </div>

      {/* Quick info row */}
      <div className="px-4 pb-3 flex flex-wrap gap-3 text-xs text-gray-400">
        {service && (
          <span className="flex items-center gap-1">
            <FiTool size={11} />
            {service.name}
          </span>
        )}
        {booking.scheduled_date && (
          <span className="flex items-center gap-1">
            <FiCalendar size={11} />
            {booking.scheduled_date}
          </span>
        )}
        {booking.scheduled_time && (
          <span className="flex items-center gap-1">
            <FiClock size={11} />
            {booking.scheduled_time}
          </span>
        )}
      </div>

      {/* Address strip */}
      {(booking.service_address || booking.city) && (
        <div className="mx-4 mb-3 px-3 py-2 bg-gray-800 rounded-lg">
          <div className="flex items-start gap-2 text-gray-300 text-sm">
            <FiMapPin size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              {booking.service_address && <p>{booking.service_address}</p>}
              {booking.landmark && <p className="text-gray-400 text-xs">Landmark: {booking.landmark}</p>}
              <p className="text-gray-400 text-xs">
                {[booking.area, booking.city, booking.pincode].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status change buttons */}
      <div className="px-4 pb-3 flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            disabled={booking.status === opt.value || updatingStatus}
            onClick={() => handleStatusChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              booking.status === opt.value
                ? 'bg-yellow-400 text-black cursor-default'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {opt.value === 'in_progress' && <FiRefreshCw size={11} />}
            {opt.value === 'completed' && <FiCheckCircle size={11} />}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Expandable detail section */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {/* Problem description */}
          {booking.problem_description && (
            <div>
              <p className="text-gray-500 text-xs uppercase font-bold mb-1">Problem</p>
              <p className="text-gray-300 text-sm">{booking.problem_description}</p>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div>
              <p className="text-gray-500 text-xs uppercase font-bold mb-1">Notes</p>
              <pre className="text-gray-300 text-xs whitespace-pre-wrap font-sans bg-gray-800 rounded p-2">
                {booking.notes}
              </pre>
            </div>
          )}

          {/* Add note */}
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Add Note</p>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write a note..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none"
              />
              <button
                onClick={handleNoteSubmit}
                disabled={submittingNote || !note.trim()}
                className="px-3 bg-yellow-400 text-black rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center gap-1 self-start mt-0"
              >
                <FiMessageSquare size={13} />
                {submittingNote ? '...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Upload repair image */}
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold mb-2">Repair Images</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((img) => (
                <a
                  key={img.id}
                  href={img.image}
                  target="_blank"
                  rel="noreferrer"
                  className="w-16 h-16 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0"
                >
                  <img src={img.image} alt={img.caption || 'repair'} className="w-full h-full object-cover" />
                </a>
              ))}
              {images.length === 0 && (
                <p className="text-gray-500 text-xs">No images yet</p>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImage}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
            >
              <FiCamera size={14} />
              {uploadingImage ? 'Uploading...' : 'Upload Photo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const TechnicianJobsPage = () => {
  const { user } = useSelector((state) => state.auth)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

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

  useEffect(() => {
    fetchJobs()
  }, [])

  const filtered = filter === 'all'
    ? jobs
    : jobs.filter((j) => j.status === filter)

  const counts = {
    all: jobs.length,
    assigned: jobs.filter((j) => j.status === 'assigned').length,
    in_progress: jobs.filter((j) => j.status === 'in_progress').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <FiTool size={20} className="text-black" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">My Jobs</h1>
            <p className="text-gray-400 text-sm">
              {user?.first_name} {user?.last_name} — Technician
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { key: 'all', label: 'Total', color: 'text-white' },
          { key: 'assigned', label: 'Assigned', color: 'text-blue-400' },
          { key: 'in_progress', label: 'In Progress', color: 'text-yellow-400' },
          { key: 'completed', label: 'Done', color: 'text-green-400' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`bg-gray-900 border rounded-xl p-3 text-center transition-all ${
              filter === s.key ? 'border-yellow-400' : 'border-gray-800 hover:border-gray-600'
            }`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{counts[s.key]}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Job list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading jobs...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FiTool size={40} className="mx-auto mb-3 opacity-30" />
          <p>No jobs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <JobCard key={job.id} booking={job} onRefresh={fetchJobs} />
          ))}
        </div>
      )}
    </div>
  )
}

export default TechnicianJobsPage
