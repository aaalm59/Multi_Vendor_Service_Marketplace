import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiDownload, FiUserPlus, FiX, FiCheck } from 'react-icons/fi'
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
const emptyNewUser = { first_name: '', last_name: '', email: '', password: '' }

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

  // Inline user creation state
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUser, setNewUser] = useState(emptyNewUser)
  const [creatingUser, setCreatingUser] = useState(false)

  const loadTechnicians = async () => {
    setLoading(true)
    try {
      const res = await technicianAPI.getAll({ limit: 100, search })
      setTechnicians(res.data.results || res.data || [])
    } catch { toast.error('Technicians load failed') }
    finally { setLoading(false) }
  }

  const loadUsers = () => {
    if (!canManage) return
    userAPI.getByRole('technician')
      .then((r) => setUsers(r.data.results || r.data || []))
      .catch(() => {})
  }

  useEffect(() => { loadTechnicians() }, [search])
  useEffect(() => { loadUsers() }, [canManage])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowCreateUser(false)
    setNewUser(emptyNewUser)
    setShowForm(true)
  }
  const openEdit = (t) => {
    setEditing(t)
    setShowCreateUser(false)
    setForm({
      user: t.user?.id || '', specialization: t.specialization || '',
      experience_years: t.experience_years || '0', hourly_rate: t.hourly_rate || '',
      availability_status: t.availability_status || 'available',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!editing && !form.user) { toast.error('Please select or create a user first'); return }
    setSaving(true)
    try {
      const payload = { ...form, experience_years: Number(form.experience_years), hourly_rate: Number(form.hourly_rate) }
      if (editing) { await technicianAPI.update(editing.id, payload); toast.success('Technician updated') }
      else { await technicianAPI.create(payload); toast.success('Technician added successfully') }
      setShowForm(false)
      loadTechnicians()
    } catch (error) {
      const data = error.response?.data
      const msg = data?.user?.[0] || data?.non_field_errors?.[0] || data?.detail || 'Operation failed'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const handleCreateUser = async () => {
    if (!newUser.first_name.trim()) { toast.error('First name is required'); return }
    if (!newUser.email.trim()) { toast.error('Email is required'); return }
    if (!newUser.password || newUser.password.length < 8) { toast.error('Password must be at least 8 characters'); return }

    setCreatingUser(true)
    try {
      const res = await userAPI.create({
        first_name: newUser.first_name.trim(),
        last_name: newUser.last_name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: 'technician',
      })
      const created = res.data
      // Add to dropdown list and auto-select
      setUsers((prev) => [...prev, created])
      setForm((prev) => ({ ...prev, user: created.id }))
      setShowCreateUser(false)
      setNewUser(emptyNewUser)
      toast.success(`User "${created.first_name || created.email}" created and selected`)
    } catch (error) {
      const data = error.response?.data
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | ')
        toast.error(msgs)
      } else {
        toast.error('Failed to create user')
      }
    } finally {
      setCreatingUser(false)
    }
  }

  const cancelCreateUser = () => {
    setShowCreateUser(false)
    setNewUser(emptyNewUser)
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

      <Modal title={editing ? 'Edit Technician' : 'Add Technician'} open={showForm} onClose={() => { setShowForm(false); setShowCreateUser(false) }}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* User selector — only shown when creating, not editing */}
          {!editing && (
            <div className="md:col-span-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormField label="User">
                    <select
                      className={inputClass}
                      value={form.user}
                      onChange={(e) => { setForm({ ...form, user: e.target.value }); if (showCreateUser) setShowCreateUser(false) }}
                      required={!showCreateUser}
                    >
                      <option value="">— Select existing technician user —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {[u.first_name, u.last_name].filter(Boolean).join(' ')} {u.email ? `(${u.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowCreateUser((v) => !v); if (!showCreateUser) setForm((p) => ({ ...p, user: '' })) }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition whitespace-nowrap ${showCreateUser ? 'bg-gray-100 border-gray-300 text-gray-600' : 'bg-yellow-400 border-yellow-400 text-black hover:bg-yellow-500'}`}
                  title="Create a new technician user"
                >
                  {showCreateUser ? <><FiX size={14} /> Cancel</> : <><FiUserPlus size={14} /> New User</>}
                </button>
              </div>

              {/* Empty state hint */}
              {users.length === 0 && !showCreateUser && (
                <p className="mt-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No technician accounts yet. Click <strong>New User</strong> to create one directly.
                </p>
              )}

              {/* Inline create-user panel */}
              {showCreateUser && (
                <div
                  className="mt-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4 space-y-3"
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                >
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <FiUserPlus size={14} className="text-yellow-600" /> Create New Technician Account
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                      <input
                        className={inputClass}
                        placeholder="First name"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser((p) => ({ ...p, first_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                      <input
                        className={inputClass}
                        placeholder="Last name"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser((p) => ({ ...p, last_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                      <input
                        className={inputClass}
                        type="email"
                        placeholder="email@example.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Password *</label>
                      <input
                        className={inputClass}
                        type="password"
                        placeholder="Min 8 characters"
                        value={newUser.password}
                        onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={cancelCreateUser}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateUser}
                      disabled={creatingUser}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:opacity-60 transition"
                    >
                      {creatingUser
                        ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                        : <><FiCheck size={13} /> Create &amp; Select</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <FormField label="Specialization">
            <input className={inputClass} value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Wiring, AC Repair" required />
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
            <button type="button" onClick={() => { setShowForm(false); setShowCreateUser(false) }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button
              type="submit"
              disabled={saving || (!editing && !form.user && !showCreateUser)}
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition"
            >
              {saving ? 'Saving...' : editing ? 'Update Technician' : 'Save Technician'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TechniciansPage
