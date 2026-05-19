import React, { useEffect, useState } from 'react'
import { FiPlus, FiTrash2, FiEdit2, FiDownload } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { customerAPI } from '../services/api'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import PageToolbar from '../components/PageToolbar'
import { canAccess, roleGroups } from '../routes/rbac'
import { downloadCSV } from '../utils/exportCSV'

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '',
  shop_name: '', gst_number: '', address: '', city: '',
  state: '', postal_code: '', preferred_contact: 'phone',
}

const CustomersPage = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { user } = useSelector((state) => state.auth)
  const canManage = canAccess(user, roleGroups.sales)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchCustomers() }, [searchTerm])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const res = await customerAPI.getAll({ limit: 100, search: searchTerm, ordering: '-created_at' })
      setCustomers(res.data.results || res.data || [])
    } catch { toast.error('Failed to load customers') }
    finally { setLoading(false) }
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      first_name: c.user?.first_name || '', last_name: c.user?.last_name || '',
      email: c.user?.email || '', phone: c.user?.phone || '',
      shop_name: c.shop_name || '', gst_number: c.gst_number || '',
      address: c.address || '', city: c.city || '',
      state: c.state || '', postal_code: c.postal_code || '',
      preferred_contact: c.preferred_contact || 'phone',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await customerAPI.update(editing.id, {
          shop_name: form.shop_name, gst_number: form.gst_number,
          address: form.address, city: form.city, state: form.state,
          postal_code: form.postal_code, preferred_contact: form.preferred_contact,
        })
        toast.success('Customer updated')
      } else {
        await customerAPI.create(form)
        toast.success('Customer created')
      }
      setShowForm(false)
      fetchCustomers()
    } catch (error) {
      toast.error(error.response?.data?.email?.[0] || error.response?.data?.detail || 'Operation failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete ${c.user?.email || 'customer'}?`)) return
    try { await customerAPI.delete(c.id); toast.success('Customer deleted'); fetchCustomers() }
    catch { toast.error('Delete failed') }
  }

  const handleExport = () => {
    downloadCSV(customers, [
      { key: 'name', label: 'Name', getValue: (r) => `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() },
      { key: 'email', label: 'Email', getValue: (r) => r.user?.email || '' },
      { key: 'phone', label: 'Phone', getValue: (r) => r.user?.phone || '' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'shop_name', label: 'Shop Name' },
      { key: 'gst_number', label: 'GST Number' },
      { key: 'total_spent', label: 'Total Spent', getValue: (r) => r.total_spent || 0 },
    ], 'customers')
    toast.success('Customers CSV downloaded')
  }

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-semibold">{`${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() || '—'}</span> },
    { key: 'email', label: 'Email', render: (r) => r.user?.email || '—' },
    { key: 'phone', label: 'Phone', render: (r) => r.user?.phone || '—' },
    { key: 'city', label: 'City' },
    { key: 'total_spent', label: 'Total Spent', render: (r) => `₹${Number(r.total_spent || 0).toLocaleString('en-IN')}` },
    canManage && {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition" title="Edit"><FiEdit2 size={13} /></button>
          <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Delete"><FiTrash2 size={13} /></button>
        </div>
      ),
    },
  ].filter(Boolean)

  const fields = [
    ['first_name', 'First Name'], ['last_name', 'Last Name'],
    ['email', 'Email'], ['phone', 'Phone'],
    ['shop_name', 'Shop Name'], ['gst_number', 'GST Number'],
    ['city', 'City'], ['state', 'State'], ['postal_code', 'Postal Code'],
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar title="Customers" subtitle="Customer profiles, contact details, and billing history." search={searchTerm} onSearch={setSearchTerm} actionLabel={canManage ? 'Add Customer' : undefined} actionIcon={FiPlus} onAction={openCreate} />
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
          <FiDownload size={14} /> Export CSV
        </button>
      </div>

      <DataTable columns={columns} rows={customers} loading={loading} emptyMessage="No customers found" />

      <Modal title={editing ? 'Edit Customer' : 'Add Customer'} open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map(([name, label]) => (
            <FormField key={name} label={label}>
              <input
                className={`${inputClass}${editing && ['first_name', 'last_name', 'email', 'phone'].includes(name) ? ' opacity-60 cursor-not-allowed' : ''}`}
                type={name === 'email' ? 'email' : 'text'}
                value={form[name]}
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                readOnly={!!(editing && ['first_name', 'last_name', 'email', 'phone'].includes(name))}
                required={!editing && ['first_name', 'email', 'city', 'state', 'postal_code'].includes(name)}
              />
            </FormField>
          ))}
          <FormField label="Preferred Contact">
            <select className={inputClass} value={form.preferred_contact} onChange={(e) => setForm({ ...form, preferred_contact: e.target.value })}>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Address">
              <textarea className={inputClass} rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required={!editing} />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition">
              {saving ? 'Saving...' : editing ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CustomersPage
