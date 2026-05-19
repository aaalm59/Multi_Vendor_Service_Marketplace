import React, { useEffect, useState } from 'react'
import { FiPlus, FiAlertTriangle } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { categoryAPI, productAPI } from '../services/api'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { canAccess, roleGroups } from '../routes/rbac'

const InventoryPage = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { user } = useSelector((state) => state.auth)
  const canManageInventory = canAccess(user, roleGroups.inventory)
  const [form, setForm] = useState({
    name: '',
    SKU: '',
    barcode: '',
    category: '',
    price: '',
    cost_price: '',
    tax_rate: '18',
    unit: 'piece',
    initial_stock: '0',
    reorder_level: '10',
    description: '',
  })

  useEffect(() => {
    fetchProducts()
  }, [search])

  useEffect(() => {
    categoryAPI.getAll()
      .then((response) => setCategories(response.data.results || response.data || []))
      .catch(() => toast.error('Categories load nahi hui'))
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await productAPI.getAll({ limit: 100, search, ordering: 'name' })
      setProducts(response.data.results || response.data || [])
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const lowStockCount = products.filter((product) => product.inventory?.is_low_stock).length

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await productAPI.create({
        ...form,
        price: Number(form.price),
        cost_price: Number(form.cost_price),
        tax_rate: Number(form.tax_rate || 0),
        initial_stock: Number(form.initial_stock || 0),
        reorder_level: Number(form.reorder_level || 0),
        category: form.category || null,
      })
      toast.success('Product created')
      setShowForm(false)
      setForm({
        name: '',
        SKU: '',
        barcode: '',
        category: '',
        price: '',
        cost_price: '',
        tax_rate: '18',
        unit: 'piece',
        initial_stock: '0',
        reorder_level: '10',
        description: '',
      })
      fetchProducts()
    } catch (error) {
      toast.error(error.response?.data?.SKU?.[0] || error.response?.data?.barcode?.[0] || 'Product create nahi hua')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Product Name', render: (row) => <span className="font-semibold text-gray-900">{row.name}</span> },
    { key: 'SKU', label: 'SKU' },
    { key: 'category', label: 'Category', render: (row) => row.category?.name || '-' },
    { key: 'price', label: 'Price', render: (row) => `₹${row.price}` },
    { key: 'stock', label: 'Stock', render: (row) => `${row.inventory?.quantity_on_hand || 0} ${row.unit || 'units'}` },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.inventory?.is_low_stock ? 'low' : 'ok'} /> },
  ]

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Inventory"
        subtitle="Products, barcodes, stock levels, GST, and low-stock alerts."
        search={search}
        onSearch={setSearch}
        actionLabel={canManageInventory ? 'Add Product' : undefined}
        actionIcon={FiPlus}
        onAction={() => setShowForm(true)}
      />

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
        <FiAlertTriangle className="text-red-600" size={24} />
        <div>
          <p className="font-semibold text-red-800">Low Stock Alert</p>
          <p className="text-sm text-red-700">You have {lowStockCount} products with low stock levels</p>
        </div>
      </div>

      <DataTable columns={columns} rows={products} loading={loading} emptyMessage="No products found" />

      <Modal title="Add Product" open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Product Name">
            <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </FormField>
          <FormField label="SKU">
            <input className={inputClass} value={form.SKU} onChange={(event) => setForm({ ...form, SKU: event.target.value.toUpperCase() })} required />
          </FormField>
          <FormField label="Barcode">
            <input className={inputClass} value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} />
          </FormField>
          <FormField label="Category">
            <select className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </FormField>
          <FormField label="Selling Price">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required />
          </FormField>
          <FormField label="Cost Price">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.cost_price} onChange={(event) => setForm({ ...form, cost_price: event.target.value })} required />
          </FormField>
          <FormField label="Opening Stock">
            <input className={inputClass} type="number" min="0" value={form.initial_stock} onChange={(event) => setForm({ ...form, initial_stock: event.target.value })} />
          </FormField>
          <FormField label="Reorder Level">
            <input className={inputClass} type="number" min="0" value={form.reorder_level} onChange={(event) => setForm({ ...form, reorder_level: event.target.value })} />
          </FormField>
          <FormField label="GST %">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.tax_rate} onChange={(event) => setForm({ ...form, tax_rate: event.target.value })} />
          </FormField>
          <FormField label="Unit">
            <input className={inputClass} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea className={inputClass} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InventoryPage
