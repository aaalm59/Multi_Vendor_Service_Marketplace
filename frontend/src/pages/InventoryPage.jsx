import React, { useEffect, useState } from 'react'
import { FiPlus, FiAlertTriangle, FiEdit2, FiTrash2, FiDownload } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { categoryAPI, productAPI } from '../services/api'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { canAccess, roleGroups } from '../routes/rbac'
import { downloadCSV } from '../utils/exportCSV'

const emptyForm = {
  name: '', SKU: '', barcode: '', category: '', price: '',
  cost_price: '', tax_rate: '18', unit: 'piece',
  initial_stock: '0', reorder_level: '10', description: '',
}

const InventoryPage = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { user } = useSelector((state) => state.auth)
  const canManage = canAccess(user, roleGroups.inventory)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchProducts() }, [search])

  useEffect(() => {
    categoryAPI.getAll()
      .then((r) => setCategories(r.data.results || r.data || []))
      .catch(() => toast.error('Categories load failed'))
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await productAPI.getAll({ limit: 200, search, ordering: 'name' })
      setProducts(res.data.results || res.data || [])
    } catch { toast.error('Failed to load products') }
    finally { setLoading(false) }
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name || '', SKU: p.SKU || '', barcode: p.barcode || '',
      category: p.category?.id || '', price: p.price || '',
      cost_price: p.cost_price || '', tax_rate: p.tax_rate || '18',
      unit: p.unit || 'piece',
      initial_stock: p.inventory?.quantity_on_hand || '0',
      reorder_level: p.reorder_level || '10',
      description: p.description || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        cost_price: Number(form.cost_price),
        tax_rate: Number(form.tax_rate || 0),
        reorder_level: Number(form.reorder_level || 0),
        category: form.category || null,
      }
      if (editing) {
        await productAPI.update(editing.id, payload)
        toast.success('Product updated')
      } else {
        payload.initial_stock = Number(form.initial_stock || 0)
        await productAPI.create(payload)
        toast.success('Product created')
      }
      setShowForm(false)
      fetchProducts()
    } catch (error) {
      toast.error(error.response?.data?.SKU?.[0] || error.response?.data?.barcode?.[0] || 'Operation failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return
    try { await productAPI.delete(p.id); toast.success('Product deleted'); fetchProducts() }
    catch { toast.error('Delete failed') }
  }

  const handleExport = () => {
    downloadCSV(products, [
      { key: 'name', label: 'Product Name' },
      { key: 'SKU', label: 'SKU' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'category', label: 'Category', getValue: (r) => r.category?.name || '' },
      { key: 'price', label: 'Selling Price' },
      { key: 'cost_price', label: 'Cost Price' },
      { key: 'stock', label: 'Stock', getValue: (r) => r.inventory?.quantity_on_hand || 0 },
      { key: 'reorder_level', label: 'Reorder Level' },
      { key: 'unit', label: 'Unit' },
    ], 'inventory')
    toast.success('Inventory CSV downloaded')
  }

  const lowStockCount = products.filter((p) => p.inventory?.is_low_stock).length

  const columns = [
    { key: 'name', label: 'Product', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
    { key: 'SKU', label: 'SKU' },
    { key: 'category', label: 'Category', render: (r) => r.category?.name || '—' },
    { key: 'price', label: 'Price', render: (r) => `₹${r.price}` },
    { key: 'cost_price', label: 'Cost', render: (r) => `₹${r.cost_price}` },
    { key: 'stock', label: 'Stock', render: (r) => `${r.inventory?.quantity_on_hand || 0} ${r.unit || 'pcs'}` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.inventory?.is_low_stock ? 'low' : 'ok'} /> },
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

  const f = (name, label, type = 'text', props = {}) => (
    <FormField key={name} label={label}>
      <input className={inputClass} type={type} value={form[name]} onChange={(e) => setForm({ ...form, [name]: type === 'text' ? e.target.value.toUpperCase() === name.toUpperCase() && name === 'SKU' ? e.target.value.toUpperCase() : e.target.value : e.target.value })} {...props} />
    </FormField>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar title="Inventory" subtitle="Products, barcodes, stock levels, GST, and low-stock alerts." search={search} onSearch={setSearch} actionLabel={canManage ? 'Add Product' : undefined} actionIcon={FiPlus} onAction={openCreate} />
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
          <FiDownload size={14} /> Export CSV
        </button>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <FiAlertTriangle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-bold text-red-800 text-sm">Low Stock Alert</p>
            <p className="text-xs text-red-700">{lowStockCount} product{lowStockCount > 1 ? 's' : ''} below reorder level — restock soon</p>
          </div>
        </div>
      )}

      <DataTable columns={columns} rows={products} loading={loading} emptyMessage="No products found" />

      <Modal title={editing ? `Edit Product — ${editing.name}` : 'Add Product'} open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Product Name">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="SKU">
            <input className={inputClass} value={form.SKU} onChange={(e) => setForm({ ...form, SKU: e.target.value.toUpperCase() })} required />
          </FormField>
          <FormField label="Barcode">
            <input className={inputClass} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </FormField>
          <FormField label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Selling Price (₹)">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </FormField>
          <FormField label="Cost Price (₹)">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} required />
          </FormField>
          {!editing && (
            <FormField label="Opening Stock">
              <input className={inputClass} type="number" min="0" value={form.initial_stock} onChange={(e) => setForm({ ...form, initial_stock: e.target.value })} />
            </FormField>
          )}
          <FormField label="Reorder Level">
            <input className={inputClass} type="number" min="0" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
          </FormField>
          <FormField label="GST %">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
          </FormField>
          <FormField label="Unit">
            <input className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition">
              {saving ? 'Saving...' : editing ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InventoryPage
