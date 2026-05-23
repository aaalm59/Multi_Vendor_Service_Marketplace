import React, { useEffect, useState, useMemo } from 'react'
import {
  FiPlus, FiAlertTriangle, FiEdit2, FiTrash2, FiDownload, FiX,
} from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { categoryAPI, productAPI, shopAPI } from '../services/api'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import PageToolbar from '../components/PageToolbar'
import { canAccess, canDo, roleGroups } from '../routes/rbac'
import { downloadCSV } from '../utils/exportCSV'

const emptyForm = {
  name: '', SKU: '', barcode: '', category: '', price: '',
  cost_price: '', tax_rate: '18', unit: 'piece',
  initial_stock: '0', reorder_level: '10', description: '',
}

const InventoryPage = () => {
  const { user } = useSelector((state) => state.auth)
  const isAdmin = user?.role === 'admin'

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [shops, setShops] = useState([])
  const [analytics, setAnalytics] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedShop, setSelectedShop] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const canCreate = canAccess(user, roleGroups.inventory, 'inventory') && canDo(user, 'inventory', 'create')
  const canEdit   = canAccess(user, roleGroups.inventory, 'inventory') && canDo(user, 'inventory', 'update')
  const canDelete = canAccess(user, roleGroups.inventory, 'inventory') && canDo(user, 'inventory', 'delete')
  const canExport = canAccess(user, roleGroups.inventory, 'inventory') && canDo(user, 'inventory', 'export_csv')

  useEffect(() => { fetchProducts() }, [search, selectedShop])

  useEffect(() => {
    categoryAPI.getAll()
      .then((r) => setCategories(r.data.results || r.data || []))
      .catch(() => toast.error('Categories load failed'))

    if (isAdmin) {
      shopAPI.getAll({ limit: 100 })
        .then((r) => setShops(r.data.results || r.data || []))
        .catch(() => {})
      productAPI.getInventoryAnalytics()
        .then((r) => setAnalytics(r.data || []))
        .catch(() => {})
    }
  }, [isAdmin])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = { limit: 500, ordering: 'name' }
      if (search) params.search = search
      if (selectedShop) params.shop = selectedShop
      const res = await productAPI.getAll(params)
      setProducts(res.data.results || res.data || [])
    } catch { toast.error('Failed to load products') }
    finally { setLoading(false) }
  }

  const filteredProducts = useMemo(() => {
    let result = products
    if (selectedCategory) result = result.filter((p) => p.category?.id === selectedCategory)
    if (showLowStockOnly) result = result.filter((p) => p.inventory?.is_low_stock)
    return result
  }, [products, selectedCategory, showLowStockOnly])

  const stats = useMemo(() => {
    const total = filteredProducts.length
    const lowStock = filteredProducts.filter((p) => p.inventory?.is_low_stock).length
    const totalStock = filteredProducts.reduce((acc, p) => acc + (p.inventory?.quantity_on_hand || 0), 0)
    const stockValue = filteredProducts.reduce(
      (acc, p) => acc + (p.inventory?.quantity_on_hand || 0) * parseFloat(p.cost_price || 0), 0,
    )
    return { total, lowStock, totalStock, stockValue }
  }, [filteredProducts])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name || '', SKU: p.SKU || '', barcode: p.barcode || '',
      category: p.category?.id || '', price: p.price || '',
      cost_price: p.cost_price || '', tax_rate: p.tax_rate || '18',
      unit: p.unit || 'piece',
      initial_stock: p.inventory?.quantity_on_hand || '0',
      reorder_level: p.inventory?.reorder_level || '10',
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
      if (isAdmin) productAPI.getInventoryAnalytics().then((r) => setAnalytics(r.data || [])).catch(() => {})
    } catch (err) {
      toast.error(err.response?.data?.SKU?.[0] || err.response?.data?.barcode?.[0] || 'Operation failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return
    try {
      await productAPI.delete(p.id)
      toast.success('Product deleted')
      fetchProducts()
      if (isAdmin) productAPI.getInventoryAnalytics().then((r) => setAnalytics(r.data || [])).catch(() => {})
    } catch { toast.error('Delete failed') }
  }

  const handleExport = () => {
    const cols = [
      { key: 'name', label: 'Product Name' },
      ...(isAdmin ? [{ key: 'shop_name', label: 'Shop' }, { key: 'shop_owner', label: 'Owner' }] : []),
      { key: 'SKU', label: 'SKU' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'category', label: 'Category', getValue: (r) => r.category?.name || '' },
      { key: 'price', label: 'Selling Price' },
      { key: 'cost_price', label: 'Cost Price' },
      { key: 'stock', label: 'Stock', getValue: (r) => r.inventory?.quantity_on_hand || 0 },
      { key: 'reorder_level', label: 'Reorder Level', getValue: (r) => r.inventory?.reorder_level || 0 },
      { key: 'unit', label: 'Unit' },
    ]
    downloadCSV(filteredProducts, cols, 'inventory')
    toast.success('Inventory CSV downloaded')
  }

  const clearFilters = () => { setSelectedShop(''); setSelectedCategory(''); setShowLowStockOnly(false) }
  const hasFilters = selectedShop || selectedCategory || showLowStockOnly

  const columns = [
    isAdmin && {
      key: 'shop', label: 'Shop',
      render: (r) => (
        <div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            🏪 {r.shop_name || '—'}
          </span>
          {r.shop_owner && <p className="text-xs text-gray-400 mt-0.5">{r.shop_owner}</p>}
        </div>
      ),
    },
    {
      key: 'name', label: 'Product',
      render: (r) => (
        <div>
          <p className="font-semibold text-gray-900">{r.name}</p>
          {r.barcode && <p className="text-xs text-gray-400">#{r.barcode}</p>}
        </div>
      ),
    },
    {
      key: 'SKU', label: 'SKU',
      render: (r) => (
        <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
          {r.SKU}
        </span>
      ),
    },
    {
      key: 'category', label: 'Category',
      render: (r) => r.category?.name
        ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{r.category.name}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'price', label: 'Price',
      render: (r) => <span className="font-semibold text-gray-900">₹{parseFloat(r.price).toLocaleString()}</span>,
    },
    {
      key: 'cost_price', label: 'Cost',
      render: (r) => <span className="text-gray-500">₹{parseFloat(r.cost_price).toLocaleString()}</span>,
    },
    {
      key: 'stock', label: 'Stock',
      render: (r) => {
        const qty = r.inventory?.quantity_on_hand || 0
        const isLow = r.inventory?.is_low_stock
        const colorClass = isLow
          ? 'bg-red-100 text-red-700'
          : qty > 20 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
        return (
          <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
            {qty} {r.unit || 'pcs'}
          </span>
        )
      },
    },
    {
      key: 'status', label: 'Status',
      render: (r) => r.inventory?.is_low_stock
        ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            <FiAlertTriangle size={9} /> Low
          </span>
        )
        : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            Ok
          </span>
        ),
    },
    (canEdit || canDelete) && {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5">
          {canEdit && (
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition" title="Edit">
              <FiEdit2 size={13} />
            </button>
          )}
          {canDelete && (
            <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Delete">
              <FiTrash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ].filter(Boolean)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar
          title="Inventory"
          subtitle={isAdmin ? 'Shop-wise inventory — all shops overview' : 'Products, barcodes, stock levels, and low-stock alerts'}
          search={search}
          onSearch={setSearch}
          actionLabel={canCreate ? 'Add Product' : undefined}
          actionIcon={FiPlus}
          onAction={openCreate}
        />
        {canExport && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            <FiDownload size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Products', value: stats.total, icon: '📦', textColor: 'text-indigo-700' },
          { label: 'Total Stock', value: stats.totalStock.toLocaleString(), icon: '🏭', textColor: 'text-blue-700' },
          {
            label: 'Low Stock', value: stats.lowStock, icon: '⚠️',
            textColor: stats.lowStock > 0 ? 'text-red-600' : 'text-green-700',
          },
          {
            label: 'Stock Value',
            value: `₹${stats.stockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: '💰', textColor: 'text-yellow-700',
          },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <span className="text-2xl">{card.icon}</span>
            <div>
              <p className="text-xs text-gray-500 font-medium">{card.label}</p>
              <p className={`text-lg font-bold ${card.textColor}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Admin: Shop-wise Analytics Cards */}
      {isAdmin && analytics.length > 0 && (
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">Shop-wise Overview — click to filter</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {analytics.map((a) => {
              const active = selectedShop === a.shop_id
              return (
                <div
                  key={a.shop_id}
                  onClick={() => setSelectedShop(active ? '' : a.shop_id)}
                  className={`flex-shrink-0 cursor-pointer rounded-xl border p-4 min-w-[190px] transition-all select-none
                    ${active
                      ? 'border-indigo-400 bg-indigo-50 shadow-md ring-1 ring-indigo-300'
                      : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-start justify-between mb-1 gap-1">
                    <p className="text-xs font-bold text-indigo-800 leading-tight truncate">{a.shop_name}</p>
                    {a.low_stock_count > 0 && (
                      <span className="flex-shrink-0 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                        {a.low_stock_count}⚠
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mb-3">{a.shop_owner || 'No owner'}</p>
                  <div className="grid grid-cols-2 gap-1.5 text-center">
                    <div className="bg-white rounded-lg p-1.5 border border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{a.total_products}</p>
                      <p className="text-xs text-gray-400">Products</p>
                    </div>
                    <div className="bg-white rounded-lg p-1.5 border border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{a.total_stock}</p>
                      <p className="text-xs text-gray-400">Stock</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                    ₹{parseFloat(a.stock_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {isAdmin && (
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            className="rounded-lg border border-gray-200 text-sm px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All Shops</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-lg border border-gray-200 text-sm px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition
            ${showLowStockOnly ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <FiAlertTriangle size={13} /> Low Stock Only
        </button>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
          >
            <FiX size={13} /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400 font-medium">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Low Stock Banner */}
      {stats.lowStock > 0 && !showLowStockOnly && (
        <button
          onClick={() => setShowLowStockOnly(true)}
          className="w-full text-left bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 hover:bg-red-100 transition"
        >
          <FiAlertTriangle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-bold text-red-800 text-sm">Low Stock Alert</p>
            <p className="text-xs text-red-700">
              {stats.lowStock} product{stats.lowStock > 1 ? 's' : ''} below reorder level — click to filter
            </p>
          </div>
        </button>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        rows={filteredProducts}
        loading={loading}
        emptyMessage="No products found"
      />

      {/* Add / Edit Modal */}
      <Modal
        title={editing ? `Edit Product — ${editing.name}` : 'Add Product'}
        open={showForm}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Product Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="SKU">
            <input
              className={inputClass}
              value={form.SKU}
              onChange={(e) => setForm({ ...form, SKU: e.target.value.toUpperCase() })}
              required
            />
          </FormField>
          <FormField label="Barcode">
            <input
              className={inputClass}
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </FormField>
          <FormField label="Category">
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Selling Price (₹)">
            <input
              className={inputClass} type="number" min="0" step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Cost Price (₹)">
            <input
              className={inputClass} type="number" min="0" step="0.01"
              value={form.cost_price}
              onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
              required
            />
          </FormField>
          {!editing && (
            <FormField label="Opening Stock">
              <input
                className={inputClass} type="number" min="0"
                value={form.initial_stock}
                onChange={(e) => setForm({ ...form, initial_stock: e.target.value })}
              />
            </FormField>
          )}
          <FormField label="Reorder Level">
            <input
              className={inputClass} type="number" min="0"
              value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
            />
          </FormField>
          <FormField label="GST %">
            <input
              className={inputClass} type="number" min="0" step="0.01"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
            />
          </FormField>
          <FormField label="Unit">
            <input
              className={inputClass}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea
                className={inputClass} rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition"
            >
              {saving ? 'Saving...' : editing ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InventoryPage
