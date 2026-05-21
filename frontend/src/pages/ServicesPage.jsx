import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiDownload } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import ModuleSummary from '../components/ModuleSummary'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { serviceAPI } from '../services/api'
import { canAccess, canDo, roleGroups } from '../routes/rbac'
import { downloadCSV } from '../utils/exportCSV'

const emptyForm = { name: '', description: '', base_price: '', estimated_duration: '60', is_available: true }

const ServicesPage = () => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { user } = useSelector((state) => state.auth)
  const canManage = canAccess(user, roleGroups.management, 'services') &&
    (canDo(user, 'services', 'create') || canDo(user, 'services', 'update') || canDo(user, 'services', 'delete'))
  const canExport = canAccess(user, roleGroups.management, 'services') && canDo(user, 'services', 'export_csv')
  const [form, setForm] = useState(emptyForm)

  const loadServices = async () => {
    setLoading(true)
    try {
      const res = await serviceAPI.getAll({ limit: 100, search })
      setServices(res.data.results || res.data || [])
    } catch { toast.error('Services load failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadServices() }, [search])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ name: s.name, description: s.description || '', base_price: s.base_price, estimated_duration: s.estimated_duration, is_available: s.is_available })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, base_price: Number(form.base_price), estimated_duration: Number(form.estimated_duration) }
      if (editing) { await serviceAPI.update(editing.id, payload); toast.success('Service updated') }
      else { await serviceAPI.create(payload); toast.success('Service created') }
      setShowForm(false); loadServices()
    } catch (error) { toast.error(error.response?.data?.detail || 'Operation failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.name}"?`)) return
    try { await serviceAPI.delete(s.id); toast.success('Service deleted'); loadServices() }
    catch { toast.error('Delete failed — service may have linked bookings') }
  }

  const handleExport = () => {
    downloadCSV(services, [
      { key: 'name', label: 'Service Name' },
      { key: 'description', label: 'Description' },
      { key: 'base_price', label: 'Base Price' },
      { key: 'estimated_duration', label: 'Duration (min)' },
      { key: 'is_available', label: 'Available', getValue: (r) => r.is_available ? 'Yes' : 'No' },
    ], 'services')
    toast.success('Services CSV downloaded')
  }

  const summary = useMemo(() => [
    { label: 'Total Services', value: services.length },
    { label: 'Available', value: services.filter((s) => s.is_available).length },
    { label: 'Avg Price', value: `₹${Math.round(services.reduce((s, i) => s + Number(i.base_price || 0), 0) / (services.length || 1)).toLocaleString('en-IN')}` },
  ], [services])

  const columns = [
    { key: 'name', label: 'Service', render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'description', label: 'Description', render: (r) => <span className="text-gray-500 text-xs truncate max-w-[200px] block">{r.description || '—'}</span> },
    { key: 'base_price', label: 'Base Price', render: (r) => `₹${r.base_price}` },
    { key: 'estimated_duration', label: 'Duration', render: (r) => `${r.estimated_duration} min` },
    { key: 'is_available', label: 'Status', render: (r) => <StatusBadge value={r.is_available ? 'available' : 'offline'} /> },
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

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar title="Service Catalog" subtitle="Bookable electric repair services with pricing and duration." search={search} onSearch={setSearch} actionLabel={canManage ? 'Add Service' : undefined} actionIcon={FiPlus} onAction={openCreate} />
        {canExport && (
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            <FiDownload size={14} /> Export CSV
          </button>
        )}
      </div>
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={services} loading={loading} />

      <Modal title={editing ? `Edit Service — ${editing.name}` : 'Add Service'} open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Service Name">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Base Price (₹)">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} required />
          </FormField>
          <FormField label="Duration (minutes)">
            <input className={inputClass} type="number" min="15" value={form.estimated_duration} onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })} required />
          </FormField>
          <FormField label="Status">
            <select className={inputClass} value={form.is_available ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, is_available: e.target.value === 'yes' })}>
              <option value="yes">Available</option>
              <option value="no">Offline</option>
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition">
              {saving ? 'Saving...' : editing ? 'Update Service' : 'Save Service'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ServicesPage
