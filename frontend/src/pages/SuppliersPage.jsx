import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiPlus } from 'react-icons/fi'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import ModuleSummary from '../components/ModuleSummary'
import PageToolbar from '../components/PageToolbar'
import { supplierAPI } from '../services/api'

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    gst_number: '',
    payment_terms: '',
  })

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const response = await supplierAPI.getAll({ limit: 100, search })
      setSuppliers(response.data.results || response.data || [])
    } catch (error) {
      toast.error('Suppliers load nahi ho paye')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [search])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await supplierAPI.create(form)
      toast.success('Supplier created')
      setShowForm(false)
      setForm({ name: '', contact_person: '', email: '', phone: '', address: '', city: '', state: '', postal_code: '', gst_number: '', payment_terms: '' })
      loadSuppliers()
    } catch (error) {
      toast.error(error.response?.data?.email?.[0] || error.response?.data?.detail || 'Supplier create nahi hua')
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => {
    const purchases = suppliers.reduce((sum, item) => sum + Number(item.total_purchases || 0), 0)
    const pending = suppliers.reduce((sum, item) => sum + Number(item.total_purchases || 0) - Number(item.total_paid || 0), 0)
    return [
      { label: 'Suppliers', value: suppliers.length },
      { label: 'Total Purchases', value: `₹${purchases.toLocaleString('en-IN')}` },
      { label: 'Pending Payable', value: `₹${pending.toLocaleString('en-IN')}` },
    ]
  }, [suppliers])

  const columns = [
    { key: 'name', label: 'Supplier' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'total_purchases', label: 'Purchases', render: (row) => `₹${Number(row.total_purchases || 0).toLocaleString('en-IN')}` },
    { key: 'due', label: 'Pending', render: (row) => `₹${(Number(row.total_purchases || 0) - Number(row.total_paid || 0)).toLocaleString('en-IN')}` },
  ]

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Supplier Management"
        subtitle="Vendor contacts, purchase history, GST records, and pending payments."
        search={search}
        onSearch={setSearch}
        actionLabel="Add Supplier"
        actionIcon={FiPlus}
        onAction={() => setShowForm(true)}
      />
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={suppliers} loading={loading} />

      <Modal title="Add Supplier" open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            ['name', 'Supplier Name'],
            ['contact_person', 'Contact Person'],
            ['email', 'Email'],
            ['phone', 'Phone'],
            ['city', 'City'],
            ['state', 'State'],
            ['postal_code', 'Postal Code'],
            ['gst_number', 'GST Number'],
            ['payment_terms', 'Payment Terms'],
          ].map(([name, label]) => (
            <FormField key={name} label={label}>
              <input
                className={inputClass}
                type={name === 'email' ? 'email' : 'text'}
                value={form[name]}
                onChange={(event) => setForm({ ...form, [name]: event.target.value })}
                required={['name', 'contact_person', 'email', 'phone', 'city', 'state', 'postal_code'].includes(name)}
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
              {saving ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default SuppliersPage
