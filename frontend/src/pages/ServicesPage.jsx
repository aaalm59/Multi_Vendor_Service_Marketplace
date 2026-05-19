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
import { serviceAPI } from '../services/api'
import { canAccess, roleGroups } from '../routes/rbac'

const ServicesPage = () => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { user } = useSelector((state) => state.auth)
  const canManageServices = canAccess(user, roleGroups.management)
  const [form, setForm] = useState({
    name: '',
    description: '',
    base_price: '',
    estimated_duration: '60',
    is_available: true,
  })

  const loadServices = async () => {
    setLoading(true)
    try {
      const response = await serviceAPI.getAll({ limit: 100, search })
      setServices(response.data.results || response.data || [])
    } catch (error) {
      toast.error('Services load nahi ho payi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [search])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await serviceAPI.create({
        ...form,
        base_price: Number(form.base_price),
        estimated_duration: Number(form.estimated_duration),
      })
      toast.success('Service created')
      setShowForm(false)
      setForm({ name: '', description: '', base_price: '', estimated_duration: '60', is_available: true })
      loadServices()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Service create nahi hui')
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => [
    { label: 'Services', value: services.length },
    { label: 'Available', value: services.filter((item) => item.is_available).length },
    { label: 'Avg Base Price', value: `₹${Math.round(services.reduce((sum, item) => sum + Number(item.base_price || 0), 0) / (services.length || 1)).toLocaleString('en-IN')}` },
  ], [services])

  const columns = [
    { key: 'name', label: 'Service' },
    { key: 'description', label: 'Description' },
    { key: 'base_price', label: 'Base Price', render: (row) => `₹${row.base_price}` },
    { key: 'estimated_duration', label: 'Duration', render: (row) => `${row.estimated_duration} min` },
    { key: 'is_available', label: 'Status', render: (row) => <StatusBadge value={row.is_available ? 'available' : 'offline'} /> },
  ]

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Service Catalog"
        subtitle="Bookable electric repair services with pricing and estimated duration."
        search={search}
        onSearch={setSearch}
        actionLabel={canManageServices ? 'Add Service' : undefined}
        actionIcon={FiPlus}
        onAction={() => setShowForm(true)}
      />
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={services} loading={loading} />

      <Modal title="Add Service" open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Service Name">
            <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </FormField>
          <FormField label="Base Price">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.base_price} onChange={(event) => setForm({ ...form, base_price: event.target.value })} required />
          </FormField>
          <FormField label="Duration (minutes)">
            <input className={inputClass} type="number" min="15" value={form.estimated_duration} onChange={(event) => setForm({ ...form, estimated_duration: event.target.value })} required />
          </FormField>
          <FormField label="Status">
            <select className={inputClass} value={form.is_available ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, is_available: event.target.value === 'yes' })}>
              <option value="yes">Available</option>
              <option value="no">Offline</option>
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea className={inputClass} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Service'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ServicesPage
