import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiCheck, FiPlus } from 'react-icons/fi'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import ModuleSummary from '../components/ModuleSummary'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { staffAPI, userAPI } from '../services/api'

const StaffPage = () => {
  const [staff, setStaff] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    user: '',
    designation: 'sales_executive',
    department: 'Sales',
    salary: '',
    joining_date: new Date().toISOString().slice(0, 10),
    emergency_contact: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
  })

  const loadStaff = async () => {
    setLoading(true)
    try {
      const response = await staffAPI.getAll({ limit: 100, search })
      setStaff(response.data.results || response.data || [])
    } catch (error) {
      toast.error('Staff load nahi ho paya')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [search])

  useEffect(() => {
    userAPI.getAll({ limit: 100, ordering: 'email' })
      .then((response) => setUsers(response.data.results || response.data || []))
      .catch(() => toast.error('Users load nahi ho paye'))
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await staffAPI.create({ ...form, salary: Number(form.salary) })
      toast.success('Staff created')
      setShowForm(false)
      setForm({ user: '', designation: 'sales_executive', department: 'Sales', salary: '', joining_date: new Date().toISOString().slice(0, 10), emergency_contact: '', address: '', city: '', state: '', postal_code: '' })
      loadStaff()
    } catch (error) {
      toast.error(error.response?.data?.user?.[0] || error.response?.data?.detail || 'Staff create nahi hua')
    } finally {
      setSaving(false)
    }
  }

  const markPresent = async (item) => {
    try {
      await staffAPI.markAttendance(item.id, 'present')
      toast.success('Attendance marked')
    } catch (error) {
      toast.error('Attendance mark nahi hui')
    }
  }

  const summary = useMemo(() => {
    const payroll = staff.reduce((sum, item) => sum + Number(item.salary || 0), 0)
    return [
      { label: 'Active Staff', value: staff.length },
      { label: 'Monthly Payroll', value: `₹${payroll.toLocaleString('en-IN')}` },
      { label: 'Departments', value: new Set(staff.map((item) => item.department).filter(Boolean)).size },
    ]
  }, [staff])

  const columns = [
    { key: 'name', label: 'Name', render: (row) => `${row.user?.first_name || ''} ${row.user?.last_name || ''}`.trim() || row.user?.email },
    { key: 'designation', label: 'Designation', render: (row) => <StatusBadge value={row.designation} tone="gray" /> },
    { key: 'department', label: 'Department' },
    { key: 'salary', label: 'Salary', render: (row) => `₹${Number(row.salary || 0).toLocaleString('en-IN')}` },
    { key: 'joining_date', label: 'Joining Date' },
    { key: 'city', label: 'City' },
    { key: 'actions', label: 'Actions', render: (row) => (
      <button onClick={() => markPresent(row)} className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100" title="Mark present">
        <FiCheck />
      </button>
    ) },
  ]

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Staff Management"
        subtitle="Attendance, payroll, role responsibility, and internal operations."
        search={search}
        onSearch={setSearch}
        actionLabel="Add Staff"
        actionIcon={FiPlus}
        onAction={() => setShowForm(true)}
      />
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={staff} loading={loading} />

      <Modal title="Add Staff" open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="User">
            <select className={inputClass} value={form.user} onChange={(event) => setForm({ ...form, user: event.target.value })} required>
              <option value="">Select user</option>
              {users.filter((item) => item.role !== 'customer' && item.role !== 'technician').map((item) => (
                <option key={item.id} value={item.id}>{item.email} ({item.role})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Designation">
            <select className={inputClass} value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })}>
              <option value="manager">Manager</option>
              <option value="sales_executive">Sales Executive</option>
              <option value="inventory_executive">Inventory Executive</option>
              <option value="accountant">Accountant</option>
              <option value="support">Support Staff</option>
            </select>
          </FormField>
          {[
            ['department', 'Department'],
            ['salary', 'Salary'],
            ['joining_date', 'Joining Date'],
            ['emergency_contact', 'Emergency Contact'],
            ['city', 'City'],
            ['state', 'State'],
            ['postal_code', 'Postal Code'],
          ].map(([name, label]) => (
            <FormField key={name} label={label}>
              <input
                className={inputClass}
                type={name === 'salary' ? 'number' : name === 'joining_date' ? 'date' : 'text'}
                min={name === 'salary' ? '0' : undefined}
                step={name === 'salary' ? '0.01' : undefined}
                value={form[name]}
                onChange={(event) => setForm({ ...form, [name]: event.target.value })}
                required
              />
            </FormField>
          ))}
          <div className="md:col-span-2">
            <FormField label="Address">
              <textarea className={inputClass} rows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default StaffPage
