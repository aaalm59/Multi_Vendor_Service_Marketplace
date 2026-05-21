import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiDownload } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import ModuleSummary from '../components/ModuleSummary'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { technicianAPI, userAPI } from '../services/api'
import { canAccess, canDo, roleGroups } from '../routes/rbac'
import { downloadCSV } from '../utils/exportCSV'

const emptyForm = { user: '', specialization: '', experience_years: '0', hourly_rate: '', availability_status: 'available' }

const TechniciansPage = () => {
  const [technicians, setTechnicians] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { user } = useSelector((state) => state.auth)
  const canManage = canAccess(user, roleGroups.management, 'technicians') &&
    (canDo(user, 'technicians', 'create') || canDo(user, 'technicians', 'update'))
  const canExport = canAccess(user, roleGroups.management, 'technicians') && canDo(user, 'technicians', 'export_csv')
  const [form, setForm] = useState(emptyForm)

  const loadTechnicians = async () => {
    setLoading(true)
    try {
      const res = await technicianAPI.getAll({ limit: 100, search })
      setTechnicians(res.data.results || res.data || [])
    } catch { toast.error('Technicians load failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadTechnicians() }, [search])

  useEffect(() => {
    if (!canManage) return
    userAPI.getByRole('technician')
      .then((r) => setUsers(r.data.results || r.data || []))
      .catch(() => {})
  }, [canManage])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (t) => {
    setEditing(t)
    setForm({
      user: t.user?.id || '', specialization: t.specialization || '',
      experience_years: t.experience_years || '0', hourly_rate: t.hourly_rate || '',
      availability_status: t.availability_status || 'available',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, experience_years: Number(form.experience_years), hourly_rate: Number(form.hourly_rate) }
      if (editing) { await technicianAPI.update(editing.id, payload); toast.success('Technician updated') }
      else { await technicianAPI.create(payload); toast.success('Technician created') }
      setShowForm(false); loadTechnicians()
    } catch (error) {
      toast.error(error.response?.data?.user?.[0] || error.response?.data?.detail || 'Operation failed')
    } finally { setSaving(false) }
  }

  const handleExport = () => {
    downloadCSV(technicians, [
      { key: 'name', label: 'Name', getValue: (r) => `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() },
      { key: 'email', label: 'Email', getValue: (r) => r.user?.email || '' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'experience_years', label: 'Experience (yrs)' },
      { key: 'hourly_rate', label: 'Hourly Rate' },
      { key: 'availability_status', label: 'Status' },
      { key: 'average_rating', label: 'Rating', getValue: (r) => Number(r.average_rating || 0).toFixed(1) },
      { key: 'completed_bookings', label: 'Completed Jobs' },
    ], 'technicians')
    toast.success('Technicians CSV downloaded')
  }

  const summary = useMemo(() => [
    { label: 'Technicians', value: technicians.length },
    { label: 'Available', value: technicians.filter((t) => t.availability_status === 'available').length },
    { label: 'Completed Jobs', value: technicians.reduce((s, t) => s + Number(t.completed_bookings || 0), 0) },
  ], [technicians])

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-semibold">{`${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() || r.user?.email}</span> },
    { key: 'specialization', label: 'Specialization' },
    { key: 'availability_status', label: 'Status', render: (r) => <StatusBadge value={r.availability_status} /> },
    { key: 'experience_years', label: 'Experience', render: (r) => `${r.experience_years} yrs` },
    { key: 'average_rating', label: 'Rating', render: (r) => `⭐ ${Number(r.average_rating || 0).toFixed(1)}` },
    { key: 'hourly_rate', label: 'Rate', render: (r) => `₹${r.hourly_rate}/hr` },
    canManage && {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition" title="Edit"><FiEdit2 size={13} /></button>
      ),
    },
  ].filter(Boolean)

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar title="Technician Management" subtitle="Track specializations, workload, availability, and field performance." search={search} onSearch={setSearch} actionLabel={canManage ? 'Add Technician' : undefined} actionIcon={FiPlus} onAction={openCreate} />
        {canExport && (
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            <FiDownload size={14} /> Export CSV
          </button>
        )}
      </div>
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={technicians} loading={loading} />

      <Modal title={editing ? 'Edit Technician' : 'Add Technician'} open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {!editing && (
            <FormField label="User">
              <select className={inputClass} value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} required>
                <option value="">Select technician user</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="Specialization">
            <input className={inputClass} value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} required />
          </FormField>
          <FormField label="Experience (years)">
            <input className={inputClass} type="number" min="0" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} required />
          </FormField>
          <FormField label="Hourly Rate (₹)">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} required />
          </FormField>
          <FormField label="Availability">
            <select className={inputClass} value={form.availability_status} onChange={(e) => setForm({ ...form, availability_status: e.target.value })}>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </FormField>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition">
              {saving ? 'Saving...' : editing ? 'Update Technician' : 'Save Technician'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TechniciansPage
