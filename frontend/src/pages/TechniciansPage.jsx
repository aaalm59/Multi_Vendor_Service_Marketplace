import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiPlus } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import ModuleSummary from '../components/ModuleSummary'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { technicianAPI, userAPI } from '../services/api'
import { canAccess, roleGroups } from '../routes/rbac'

const TechniciansPage = () => {
  const [technicians, setTechnicians] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { user } = useSelector((state) => state.auth)
  const canManageTechnicians = canAccess(user, roleGroups.management)
  const [form, setForm] = useState({
    user: '',
    specialization: '',
    experience_years: '0',
    hourly_rate: '',
    availability_status: 'available',
  })

  const loadTechnicians = async () => {
    setLoading(true)
    try {
      const response = await technicianAPI.getAll({ limit: 100, search })
      setTechnicians(response.data.results || response.data || [])
    } catch (error) {
      toast.error('Technicians load nahi ho paye')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTechnicians()
  }, [search])

  useEffect(() => {
    if (!canManageTechnicians) return
    userAPI.getByRole('technician')
      .then((response) => setUsers(response.data.results || response.data || []))
      .catch(() => toast.error('Technician users load nahi ho paye'))
  }, [canManageTechnicians])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await technicianAPI.create({
        ...form,
        experience_years: Number(form.experience_years),
        hourly_rate: Number(form.hourly_rate),
      })
      toast.success('Technician created')
      setShowForm(false)
      setForm({ user: '', specialization: '', experience_years: '0', hourly_rate: '', availability_status: 'available' })
      loadTechnicians()
    } catch (error) {
      toast.error(error.response?.data?.user?.[0] || error.response?.data?.detail || 'Technician create nahi hua')
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => [
    { label: 'Technicians', value: technicians.length },
    { label: 'Available', value: technicians.filter((item) => item.availability_status === 'available').length },
    { label: 'Completed Jobs', value: technicians.reduce((sum, item) => sum + Number(item.completed_bookings || 0), 0) },
  ], [technicians])

  const columns = [
    { key: 'name', label: 'Name', render: (row) => `${row.user?.first_name || ''} ${row.user?.last_name || ''}`.trim() || row.user?.email },
    { key: 'specialization', label: 'Specialization' },
    { key: 'availability_status', label: 'Status', render: (row) => <StatusBadge value={row.availability_status} /> },
    { key: 'experience_years', label: 'Experience', render: (row) => `${row.experience_years} yrs` },
    { key: 'average_rating', label: 'Rating', render: (row) => Number(row.average_rating || 0).toFixed(1) },
    { key: 'hourly_rate', label: 'Rate', render: (row) => `₹${row.hourly_rate}/hr` },
  ]

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Technician Management"
        subtitle="Track specializations, workload, availability, and field performance."
        search={search}
        onSearch={setSearch}
        actionLabel={canManageTechnicians ? 'Add Technician' : undefined}
        actionIcon={FiPlus}
        onAction={() => setShowForm(true)}
      />
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={technicians} loading={loading} />

      <Modal title="Add Technician" open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="User">
            <select className={inputClass} value={form.user} onChange={(event) => setForm({ ...form, user: event.target.value })} required>
              <option value="">Select technician user</option>
              {users.map((item) => <option key={item.id} value={item.id}>{item.email}</option>)}
            </select>
          </FormField>
          <FormField label="Specialization">
            <input className={inputClass} value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} required />
          </FormField>
          <FormField label="Experience Years">
            <input className={inputClass} type="number" min="0" value={form.experience_years} onChange={(event) => setForm({ ...form, experience_years: event.target.value })} required />
          </FormField>
          <FormField label="Hourly Rate">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.hourly_rate} onChange={(event) => setForm({ ...form, hourly_rate: event.target.value })} required />
          </FormField>
          <FormField label="Availability">
            <select className={inputClass} value={form.availability_status} onChange={(event) => setForm({ ...form, availability_status: event.target.value })}>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </FormField>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Technician'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TechniciansPage
