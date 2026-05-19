import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiCheck, FiPlus, FiEdit2, FiDownload } from 'react-icons/fi'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import ModuleSummary from '../components/ModuleSummary'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { staffAPI, userAPI } from '../services/api'
import { downloadCSV } from '../utils/exportCSV'

const emptyForm = {
  user: '', designation: 'sales_executive', department: 'Sales',
  salary: '', joining_date: new Date().toISOString().slice(0, 10),
  emergency_contact: '', address: '', city: '', state: '', postal_code: '',
}

const StaffPage = () => {
  const [staff, setStaff] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const loadStaff = async () => {
    setLoading(true)
    try {
      const res = await staffAPI.getAll({ limit: 100, search })
      setStaff(res.data.results || res.data || [])
    } catch { toast.error('Staff load failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadStaff() }, [search])

  useEffect(() => {
    userAPI.getAll({ limit: 100, ordering: 'email' })
      .then((r) => setUsers(r.data.results || r.data || []))
      .catch(() => {})
  }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({
      user: s.user?.id || '', designation: s.designation || 'sales_executive',
      department: s.department || 'Sales', salary: s.salary || '',
      joining_date: s.joining_date || new Date().toISOString().slice(0, 10),
      emergency_contact: s.emergency_contact || '', address: s.address || '',
      city: s.city || '', state: s.state || '', postal_code: s.postal_code || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, salary: Number(form.salary) }
      if (editing) { await staffAPI.update(editing.id, payload); toast.success('Staff updated') }
      else { await staffAPI.create(payload); toast.success('Staff created') }
      setShowForm(false); loadStaff()
    } catch (error) {
      toast.error(error.response?.data?.user?.[0] || error.response?.data?.detail || 'Operation failed')
    } finally { setSaving(false) }
  }

  const markPresent = async (item) => {
    try { await staffAPI.markAttendance(item.id, 'present'); toast.success('Attendance marked') }
    catch { toast.error('Attendance mark failed') }
  }

  const handleExport = () => {
    downloadCSV(staff, [
      { key: 'name', label: 'Name', getValue: (r) => `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() },
      { key: 'email', label: 'Email', getValue: (r) => r.user?.email || '' },
      { key: 'designation', label: 'Designation' },
      { key: 'department', label: 'Department' },
      { key: 'salary', label: 'Salary' },
      { key: 'joining_date', label: 'Joining Date' },
      { key: 'city', label: 'City' },
    ], 'staff')
    toast.success('Staff CSV downloaded')
  }

  const summary = useMemo(() => {
    const payroll = staff.reduce((s, i) => s + Number(i.salary || 0), 0)
    return [
      { label: 'Active Staff', value: staff.length },
      { label: 'Monthly Payroll', value: `₹${payroll.toLocaleString('en-IN')}` },
      { label: 'Departments', value: new Set(staff.map((i) => i.department).filter(Boolean)).size },
    ]
  }, [staff])

  const designations = ['manager', 'sales_executive', 'inventory_executive', 'accountant', 'support']

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-semibold">{`${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() || r.user?.email}</span> },
    { key: 'designation', label: 'Designation', render: (r) => <StatusBadge value={r.designation} tone="gray" /> },
    { key: 'department', label: 'Department' },
    { key: 'salary', label: 'Salary', render: (r) => `₹${Number(r.salary || 0).toLocaleString('en-IN')}` },
    { key: 'joining_date', label: 'Joining' },
    { key: 'city', label: 'City' },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition" title="Edit"><FiEdit2 size={13} /></button>
          <button onClick={() => markPresent(r)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition" title="Mark Present"><FiCheck size={13} /></button>
        </div>
      ),
    },
  ]

  const textFields = [
    ['department', 'Department'], ['emergency_contact', 'Emergency Contact'],
    ['city', 'City'], ['state', 'State'], ['postal_code', 'Postal Code'],
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar title="Staff Management" subtitle="Attendance, payroll, role responsibility, and internal operations." search={search} onSearch={setSearch} actionLabel="Add Staff" actionIcon={FiPlus} onAction={openCreate} />
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
          <FiDownload size={14} /> Export CSV
        </button>
      </div>
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={staff} loading={loading} />

      <Modal title={editing ? 'Edit Staff' : 'Add Staff'} open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {!editing && (
            <FormField label="User">
              <select className={inputClass} value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} required>
                <option value="">Select user</option>
                {users.filter((u) => u.role !== 'customer' && u.role !== 'technician').map((u) => (
                  <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="Designation">
            <select className={inputClass} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}>
              {designations.map((d) => <option key={d} value={d} className="capitalize">{d.replace('_', ' ')}</option>)}
            </select>
          </FormField>
          <FormField label="Salary (₹)">
            <input className={inputClass} type="number" min="0" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} required />
          </FormField>
          <FormField label="Joining Date">
            <input className={inputClass} type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} required />
          </FormField>
          {textFields.map(([name, label]) => (
            <FormField key={name} label={label}>
              <input className={inputClass} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} required />
            </FormField>
          ))}
          <div className="md:col-span-2">
            <FormField label="Address">
              <textarea className={inputClass} rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition">
              {saving ? 'Saving...' : editing ? 'Update Staff' : 'Save Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default StaffPage
