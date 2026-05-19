import React, { useEffect, useState } from 'react'
import { FiCheck, FiPlus, FiUserCheck, FiX } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { bookingAPI, customerAPI, serviceAPI, technicianAPI } from '../services/api'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { canAccess, roleGroups, ROLES } from '../routes/rbac'

const BookingsPage = () => {
  const [bookings, setBookings] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
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

  // Complete booking modal
  const [completeModal, setCompleteModal] = useState(null)
  const [finalAmount, setFinalAmount] = useState('')
  const [completing, setCompleting] = useState(false)

  const { user } = useSelector((state) => state.auth)
  const canCreateBooking = canAccess(user, [...roleGroups.management, ROLES.CUSTOMER])
  const canAssignTechnician = canAccess(user, roleGroups.management)
  const canCompleteBooking = canAccess(user, roleGroups.service)

  const [form, setForm] = useState({
    customer: '',
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
    const requests = [
      customerAPI.getAll({ limit: 100 }),
      serviceAPI.getAll({ limit: 100 }),
    ]
    if (canAssignTechnician) requests.push(technicianAPI.getAvailable())
    Promise.all(requests).then(([customerRes, serviceRes, techRes]) => {
      setCustomers(customerRes.data.results || customerRes.data || [])
      setServices(serviceRes.data.results || serviceRes.data || [])
      if (techRes) setTechnicians(techRes.data.results || techRes.data || [])
    }).catch(() => toast.error('Form data load failed'))
  }, [canAssignTechnician])

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await bookingAPI.create({
        ...form,
        booking_date: new Date(form.booking_date).toISOString(),
        quote_amount: form.quote_amount || null,
      })
      toast.success('Booking created')
      setShowForm(false)
      setForm({ customer: '', service: '', booking_date: new Date().toISOString().slice(0, 16), scheduled_date: '', scheduled_time: '', service_address: '', problem_description: '', quote_amount: '' })
      fetchBookings()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Booking create failed')
    } finally {
      setSaving(false)
    }
  }

  const openAssignModal = (booking) => {
    setAssignModal(booking)
    setSelectedTechnician(technicians[0]?.id || '')
  }

  const handleAssignTechnician = async () => {
    if (!selectedTechnician) { toast.error('Select a technician'); return }
    setAssigning(true)
    try {
      await bookingAPI.assignTechnician(assignModal.id, selectedTechnician)
      const tech = technicians.find((t) => t.id === selectedTechnician)
      toast.success(`Assigned to ${tech?.user?.first_name || 'technician'}`)
      setAssignModal(null)
      fetchBookings()
    } catch {
      toast.error('Technician assignment failed')
    } finally {
      setAssigning(false)
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
    { key: 'customer', label: 'Customer', render: (row) => `${row.customer?.user?.first_name || ''} ${row.customer?.user?.last_name || ''}`.trim() || '-' },
    { key: 'service', label: 'Service', render: (row) => row.service?.name || '-' },
    { key: 'technician', label: 'Technician', render: (row) => row.technician ? `${row.technician.user?.first_name || ''} ${row.technician.user?.last_name || ''}`.trim() : <span className="text-gray-400 text-xs">Unassigned</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
    { key: 'amount', label: 'Amount', render: (row) => `₹${Number(row.final_amount || row.quote_amount || 0).toLocaleString('en-IN')}` },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-1.5">
          {canAssignTechnician && !row.technician && row.status !== 'completed' && row.status !== 'cancelled' && (
            <button onClick={() => openAssignModal(row)} className="rounded-lg bg-sky-50 p-2 text-sky-700 hover:bg-sky-100 transition" title="Assign technician">
              <FiUserCheck size={15} />
            </button>
          )}
          {canCompleteBooking && row.status !== 'completed' && row.status !== 'cancelled' && (
            <button onClick={() => openCompleteModal(row)} className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 transition" title="Complete booking">
              <FiCheck size={15} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Service Bookings"
        subtitle="Create bookings, assign technicians, and complete service jobs."
        search={search}
        onSearch={setSearch}
        actionLabel={canCreateBooking ? 'New Booking' : undefined}
        actionIcon={FiPlus}
        onAction={() => setShowForm(true)}
      />

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

      <DataTable columns={columns} rows={bookings} loading={loading} emptyMessage="No bookings found" />

      {/* New Booking Modal */}
      <Modal title="New Service Booking" open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Customer">
            <select className={inputClass} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} required>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.user?.first_name} {c.user?.last_name} — {c.city}</option>
              ))}
            </select>
          </FormField>
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
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition">
              {saving ? 'Saving...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Technician Modal */}
      <Modal title="Assign Technician" open={!!assignModal} onClose={() => setAssignModal(null)} width="max-w-md">
        {assignModal && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-800">{assignModal.booking_number}</p>
              <p className="text-xs text-gray-500 mt-1">{assignModal.service?.name} — {assignModal.customer?.user?.first_name} {assignModal.customer?.user?.last_name}</p>
            </div>
            {technicians.length === 0 ? (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
                No available technicians right now. Please make a technician available first.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Available Technician</label>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {technicians.map((tech) => (
                      <label
                        key={tech.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          selectedTechnician === tech.id
                            ? 'border-yellow-400 bg-yellow-50'
                            : 'border-gray-200 hover:border-yellow-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="technician"
                          value={tech.id}
                          checked={selectedTechnician === tech.id}
                          onChange={() => setSelectedTechnician(tech.id)}
                          className="accent-yellow-400"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{tech.user?.first_name} {tech.user?.last_name}</p>
                          <p className="text-xs text-gray-500">{tech.specialization} • {tech.experience_years} yrs exp • ₹{tech.hourly_rate}/hr</p>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Available</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button onClick={() => setAssignModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                  <button
                    onClick={handleAssignTechnician}
                    disabled={assigning || !selectedTechnician}
                    className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition flex items-center gap-2"
                  >
                    {assigning ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <FiUserCheck size={16} />}
                    {assigning ? 'Assigning...' : 'Assign Technician'}
                  </button>
                </div>
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
    </div>
  )
}

export default BookingsPage
