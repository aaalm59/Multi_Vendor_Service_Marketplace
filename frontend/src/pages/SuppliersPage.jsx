import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiDownload, FiPackage } from 'react-icons/fi'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import ModuleSummary from '../components/ModuleSummary'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { supplierAPI, purchaseAPI } from '../services/api'
import { downloadCSV } from '../utils/exportCSV'

const emptySupplier = { name: '', contact_person: '', email: '', phone: '', address: '', city: '', state: '', postal_code: '', gst_number: '', payment_terms: '' }
const emptyPurchase = { supplier: '', purchase_date: new Date().toISOString().slice(0, 10), notes: '', items: [{ product_name: '', quantity: 1, unit_price: '' }] }

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showPurchase, setShowPurchase] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptySupplier)
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase)

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const res = await supplierAPI.getAll({ limit: 100, search })
      setSuppliers(res.data.results || res.data || [])
    } catch { toast.error('Suppliers load failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadSuppliers() }, [search])

  const openCreate = () => { setEditing(null); setForm(emptySupplier); setShowForm(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ name: s.name, contact_person: s.contact_person || '', email: s.email || '', phone: s.phone || '', address: s.address || '', city: s.city || '', state: s.state || '', postal_code: s.postal_code || '', gst_number: s.gst_number || '', payment_terms: s.payment_terms || '' })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) { await supplierAPI.update(editing.id, form); toast.success('Supplier updated') }
      else { await supplierAPI.create(form); toast.success('Supplier created') }
      setShowForm(false); loadSuppliers()
    } catch (error) { toast.error(error.response?.data?.email?.[0] || 'Operation failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.name}"?`)) return
    try { await supplierAPI.delete(s.id); toast.success('Supplier deleted'); loadSuppliers() }
    catch { toast.error('Delete failed — supplier may have purchase records') }
  }

  const handleExport = () => {
    downloadCSV(suppliers, [
      { key: 'name', label: 'Supplier Name' },
      { key: 'contact_person', label: 'Contact Person' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'city', label: 'City' },
      { key: 'gst_number', label: 'GST Number' },
      { key: 'total_purchases', label: 'Total Purchases', getValue: (r) => r.total_purchases || 0 },
    ], 'suppliers')
    toast.success('Suppliers CSV downloaded')
  }

  const summary = useMemo(() => {
    const purchases = suppliers.reduce((s, i) => s + Number(i.total_purchases || 0), 0)
    const pending = suppliers.reduce((s, i) => s + Number(i.total_purchases || 0) - Number(i.total_paid || 0), 0)
    return [
      { label: 'Suppliers', value: suppliers.length },
      { label: 'Total Purchases', value: `₹${purchases.toLocaleString('en-IN')}` },
      { label: 'Pending Payable', value: `₹${pending.toLocaleString('en-IN')}` },
    ]
  }, [suppliers])

  const textFields = [
    ['name', 'Supplier Name'], ['contact_person', 'Contact Person'],
    ['email', 'Email'], ['phone', 'Phone'],
    ['city', 'City'], ['state', 'State'],
    ['postal_code', 'Postal Code'], ['gst_number', 'GST Number'],
    ['payment_terms', 'Payment Terms'],
  ]

  const columns = [
    { key: 'name', label: 'Supplier', render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'contact_person', label: 'Contact' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'total_purchases', label: 'Purchases', render: (r) => `₹${Number(r.total_purchases || 0).toLocaleString('en-IN')}` },
    { key: 'due', label: 'Pending', render: (r) => `₹${(Number(r.total_purchases || 0) - Number(r.total_paid || 0)).toLocaleString('en-IN')}` },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition" title="Edit"><FiEdit2 size={13} /></button>
          <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Delete"><FiTrash2 size={13} /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar title="Supplier Management" subtitle="Vendor contacts, purchase history, GST records, and pending payments." search={search} onSearch={setSearch} actionLabel="Add Supplier" actionIcon={FiPlus} onAction={openCreate} />
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
          <FiDownload size={14} /> Export CSV
        </button>
      </div>
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={suppliers} loading={loading} />

      <Modal title={editing ? `Edit Supplier — ${editing.name}` : 'Add Supplier'} open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {textFields.map(([name, label]) => (
            <FormField key={name} label={label}>
              <input className={inputClass} type={name === 'email' ? 'email' : 'text'} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} required={['name', 'contact_person', 'email', 'phone', 'city', 'state', 'postal_code'].includes(name)} />
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
              {saving ? 'Saving...' : editing ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default SuppliersPage
