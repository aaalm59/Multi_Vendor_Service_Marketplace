import React, { useEffect, useState, useMemo } from 'react'
import {
  FiPlus, FiAlertTriangle, FiEdit2, FiTrash2, FiDownload, FiX, FiTag,
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

// ── empty forms ──────────────────────────────────────────────────────────────
const emptyProductForm = {
  name: '', SKU: '', barcode: '', category: '', price: '',
  cost_price: '', tax_rate: '18', unit: 'piece',
  initial_stock: '0', reorder_level: '10', description: '',
}
const emptyCatForm = { name: '', description: '' }

// ── helpers ──────────────────────────────────────────────────────────────────
const catLabel = (c, isAdmin) =>
  isAdmin && c.shop_name ? `${c.name}  (${c.shop_name})` : c.name

const InventoryPage = () => {
  const { user } = useSelector((state) => state.auth)
  const isAdmin = user?.role === 'admin'

  // tabs
  const [activeTab, setActiveTab] = useState('products')

  // product state
  const [products, setProducts]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [selectedShop, setSelectedShop] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct]   = useState(null)
  const [savingProduct, setSavingProduct]     = useState(false)
  const [productForm, setProductForm]         = useState(emptyProductForm)

  // category state
  const [categories, setCategories]     = useState([])
  const [shops, setShops]               = useState([])
  const [analytics, setAnalytics]       = useState([])
  const [catSearch, setCatSearch]       = useState('')
  const [catShopFilter, setCatShopFilter] = useState('')
  const [showCatForm, setShowCatForm]   = useState(false)
  const [editingCat, setEditingCat]     = useState(null)
  const [savingCat, setSavingCat]       = useState(false)
  const [catForm, setCatForm]           = useState(emptyCatForm)

  // quick-create category (from inside product form)
  const [showQuickCat, setShowQuickCat] = useState(false)
  const [quickCatForm, setQuickCatForm] = useState(emptyCatForm)
  const [savingQuickCat, setSavingQuickCat] = useState(false)

  // permissions
  const canCreate = canAccess(user, roleGroups.inventory, 'inventory') && canDo(user, 'inventory', 'create')
  const canEdit   = canAccess(user, roleGroups.inventory, 'inventory') && canDo(user, 'inventory', 'update')
  const canDelete = canAccess(user, roleGroups.inventory, 'inventory') && canDo(user, 'inventory', 'delete')
  const canExport = canAccess(user, roleGroups.inventory, 'inventory') && canDo(user, 'inventory', 'export_csv')

  // ── data loading ───────────────────────────────────────────────────────────
  useEffect(() => { fetchProducts() }, [search, selectedShop])

  useEffect(() => {
    fetchCategories()
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

  const fetchCategories = async () => {
    try {
      const res = await categoryAPI.getAll()
      setCategories(res.data.results || res.data || [])
    } catch { toast.error('Categories load failed') }
  }

  // ── filtered data ─────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let r = products
    if (selectedCategory) r = r.filter((p) => p.category?.id === selectedCategory)
    if (showLowStockOnly) r = r.filter((p) => p.inventory?.is_low_stock)
    return r
  }, [products, selectedCategory, showLowStockOnly])

  const filteredCategories = useMemo(() => {
    let r = categories
    if (catSearch) r = r.filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    if (catShopFilter) r = r.filter((c) => c.shop === catShopFilter)
    return r
  }, [categories, catSearch, catShopFilter])

  const stats = useMemo(() => ({
    total:     filteredProducts.length,
    lowStock:  filteredProducts.filter((p) => p.inventory?.is_low_stock).length,
    totalStock: filteredProducts.reduce((a, p) => a + (p.inventory?.quantity_on_hand || 0), 0),
    stockValue: filteredProducts.reduce((a, p) => a + (p.inventory?.quantity_on_hand || 0) * parseFloat(p.cost_price || 0), 0),
  }), [filteredProducts])

  // ── product handlers ───────────────────────────────────────────────────────
  const openCreateProduct = () => {
    setEditingProduct(null); setProductForm(emptyProductForm); setShowProductForm(true)
  }
  const openEditProduct = (p) => {
    setEditingProduct(p)
    setProductForm({
      name: p.name || '', SKU: p.SKU || '', barcode: p.barcode || '',
      category: p.category?.id || '', price: p.price || '',
      cost_price: p.cost_price || '', tax_rate: p.tax_rate || '18',
      unit: p.unit || 'piece',
      initial_stock: p.inventory?.quantity_on_hand || '0',
      reorder_level: p.inventory?.reorder_level || '10',
      description: p.description || '',
    })
    setShowProductForm(true)
  }

  const handleProductSubmit = async (e) => {
    e.preventDefault()
    setSavingProduct(true)
    try {
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        cost_price: Number(productForm.cost_price),
        tax_rate: Number(productForm.tax_rate || 0),
        reorder_level: Number(productForm.reorder_level || 0),
        category: productForm.category || null,
      }
      if (editingProduct) {
        await productAPI.update(editingProduct.id, payload)
        toast.success('Product updated')
      } else {
        payload.initial_stock = Number(productForm.initial_stock || 0)
        await productAPI.create(payload)
        toast.success('Product created')
      }
      setShowProductForm(false)
      fetchProducts()
      if (isAdmin) productAPI.getInventoryAnalytics().then((r) => setAnalytics(r.data || [])).catch(() => {})
    } catch (err) {
      toast.error(err.response?.data?.SKU?.[0] || err.response?.data?.barcode?.[0] || 'Operation failed')
    } finally { setSavingProduct(false) }
  }

  const handleDeleteProduct = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return
    try { await productAPI.delete(p.id); toast.success('Product deleted'); fetchProducts() }
    catch { toast.error('Delete failed') }
  }

  // ── category dropdown change (intercept __new__) ──────────────────────────
  const handleCategorySelect = (val) => {
    if (val === '__new__') {
      setQuickCatForm(emptyCatForm)
      setShowQuickCat(true)
    } else {
      setProductForm((f) => ({ ...f, category: val }))
    }
  }

  const handleQuickCatSave = async (e) => {
    e.preventDefault()
    if (!quickCatForm.name.trim()) { toast.error('Name required'); return }
    setSavingQuickCat(true)
    try {
      const res = await categoryAPI.create(quickCatForm)
      const newCat = res.data
      await fetchCategories()
      setProductForm((f) => ({ ...f, category: newCat.id }))
      setShowQuickCat(false)
      toast.success(`Category "${newCat.name}" created and selected!`)
    } catch { toast.error('Category creation failed') }
    finally { setSavingQuickCat(false) }
  }

  // ── category CRUD ─────────────────────────────────────────────────────────
  const openCreateCat = () => { setEditingCat(null); setCatForm(emptyCatForm); setShowCatForm(true) }
  const openEditCat   = (c) => {
    setEditingCat(c)
    setCatForm({ name: c.name, description: c.description || '' })
    setShowCatForm(true)
  }

  const handleCatSubmit = async (e) => {
    e.preventDefault()
    setSavingCat(true)
    try {
      if (editingCat) {
        await categoryAPI.update(editingCat.id, catForm)
        toast.success('Category updated')
      } else {
        await categoryAPI.create(catForm)
        toast.success('Category created')
      }
      setShowCatForm(false)
      fetchCategories()
    } catch (err) {
      toast.error(err.response?.data?.name?.[0] || 'Operation failed')
    } finally { setSavingCat(false) }
  }

  const handleDeleteCat = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"? Products will lose this category.`)) return
    try { await categoryAPI.delete(c.id); toast.success('Category deleted'); fetchCategories() }
    catch { toast.error('Delete failed — category may be in use') }
  }

  // ── export ────────────────────────────────────────────────────────────────
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
      { key: 'unit', label: 'Unit' },
    ]
    downloadCSV(filteredProducts, cols, 'inventory')
    toast.success('Inventory CSV downloaded')
  }

  const clearFilters = () => { setSelectedShop(''); setSelectedCategory(''); setShowLowStockOnly(false) }
  const hasFilters = selectedShop || selectedCategory || showLowStockOnly

  // ── product table columns ─────────────────────────────────────────────────
  const productColumns = [
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
    { key: 'SKU', label: 'SKU', render: (r) => <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">{r.SKU}</span> },
    {
      key: 'category', label: 'Category',
      render: (r) => r.category?.name
        ? (
          <div>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{r.category.name}</span>
            {isAdmin && r.category.shop_name && (
              <p className="text-xs text-gray-400 mt-0.5">{r.category.shop_name}</p>
            )}
          </div>
        )
        : <span className="text-gray-400">—</span>,
    },
    { key: 'price', label: 'Price', render: (r) => <span className="font-semibold">₹{parseFloat(r.price).toLocaleString()}</span> },
    { key: 'cost_price', label: 'Cost', render: (r) => <span className="text-gray-500">₹{parseFloat(r.cost_price).toLocaleString()}</span> },
    {
      key: 'stock', label: 'Stock',
      render: (r) => {
        const qty = r.inventory?.quantity_on_hand || 0
        const isLow = r.inventory?.is_low_stock
        const cls = isLow ? 'bg-red-100 text-red-700' : qty > 20 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
        return <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${cls}`}>{qty} {r.unit || 'pcs'}</span>
      },
    },
    {
      key: 'status', label: 'Status',
      render: (r) => r.inventory?.is_low_stock
        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><FiAlertTriangle size={9} /> Low</span>
        : <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Ok</span>,
    },
    (canEdit || canDelete) && {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5">
          {canEdit && <button onClick={() => openEditProduct(r)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition"><FiEdit2 size={13} /></button>}
          {canDelete && <button onClick={() => handleDeleteProduct(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"><FiTrash2 size={13} /></button>}
        </div>
      ),
    },
  ].filter(Boolean)

  // ── category table columns ────────────────────────────────────────────────
  const catColumns = [
    {
      key: 'name', label: 'Category',
      render: (c) => <span className="font-semibold text-gray-900">{c.name}</span>,
    },
    isAdmin && {
      key: 'shop', label: 'Shop',
      render: (c) => c.shop_name
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">🏪 {c.shop_name}</span>
        : <span className="text-gray-400 text-xs">Global</span>,
    },
    {
      key: 'product_count', label: 'Products',
      render: (c) => <span className="font-bold text-gray-700">{c.product_count ?? 0}</span>,
    },
    {
      key: 'description', label: 'Description',
      render: (c) => <span className="text-gray-500 text-xs truncate max-w-[200px] block">{c.description || '—'}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (c) => c.is_active
        ? <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Active</span>
        : <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">Inactive</span>,
    },
    (canEdit || canDelete) && {
      key: 'actions', label: 'Actions',
      render: (c) => (
        <div className="flex gap-1.5">
          {canEdit && <button onClick={() => openEditCat(c)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition"><FiEdit2 size={13} /></button>}
          {canDelete && <button onClick={() => handleDeleteCat(c)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"><FiTrash2 size={13} /></button>}
        </div>
      ),
    },
  ].filter(Boolean)

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header + Tabs */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin ? 'Shop-wise inventory — all shops overview' : 'Products, barcodes, stock levels, and low-stock alerts'}
          </p>
          <div className="flex gap-0 mt-3 border-b border-gray-200">
            {['products', 'categories'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-semibold capitalize transition border-b-2 -mb-px
                  ${activeTab === tab
                    ? 'border-yellow-400 text-yellow-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab === 'products' ? `Products (${products.length})` : `Categories (${categories.length})`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap pb-1">
          {activeTab === 'products' && canCreate && (
            <button onClick={openCreateProduct} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-sm font-bold text-black transition">
              <FiPlus size={15} /> Add Product
            </button>
          )}
          {activeTab === 'categories' && canCreate && (
            <button onClick={openCreateCat} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-sm font-bold text-black transition">
              <FiTag size={15} /> Add Category
            </button>
          )}
          {activeTab === 'products' && canExport && (
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              <FiDownload size={14} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ══════════════ PRODUCTS TAB ══════════════ */}
      {activeTab === 'products' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Products', value: stats.total, icon: '📦', c: 'text-indigo-700' },
              { label: 'Total Stock', value: stats.totalStock.toLocaleString(), icon: '🏭', c: 'text-blue-700' },
              { label: 'Low Stock', value: stats.lowStock, icon: '⚠️', c: stats.lowStock > 0 ? 'text-red-600' : 'text-green-700' },
              { label: 'Stock Value', value: `₹${stats.stockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: '💰', c: 'text-yellow-700' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
                <span className="text-2xl">{card.icon}</span>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                  <p className={`text-lg font-bold ${card.c}`}>{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Admin Shop Analytics */}
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
                        ${active ? 'border-indigo-400 bg-indigo-50 shadow-md ring-1 ring-indigo-300' : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm'}`}
                    >
                      <div className="flex items-start justify-between mb-1 gap-1">
                        <p className="text-xs font-bold text-indigo-800 leading-tight truncate">{a.shop_name}</p>
                        {a.low_stock_count > 0 && (
                          <span className="flex-shrink-0 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{a.low_stock_count}⚠</span>
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            {isAdmin && (
              <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)}
                className="rounded-lg border border-gray-200 text-sm px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option value="">All Shops</option>
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-gray-200 text-sm px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{catLabel(c, isAdmin)}</option>
              ))}
            </select>
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition
                ${showLowStockOnly ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <FiAlertTriangle size={13} /> Low Stock Only
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                <FiX size={13} /> Clear
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400 font-medium">{filteredProducts.length} products</span>
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
                <p className="text-xs text-red-700">{stats.lowStock} product{stats.lowStock > 1 ? 's' : ''} below reorder level — click to filter</p>
              </div>
            </button>
          )}

          <DataTable columns={productColumns} rows={filteredProducts} loading={loading} emptyMessage="No products found" />
        </>
      )}

      {/* ══════════════ CATEGORIES TAB ══════════════ */}
      {activeTab === 'categories' && (
        <>
          {/* Category Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Total Categories', value: categories.length, icon: '🏷️', c: 'text-indigo-700' },
              { label: 'With Products', value: categories.filter((c) => (c.product_count || 0) > 0).length, icon: '📦', c: 'text-green-700' },
              { label: 'Empty Categories', value: categories.filter((c) => !(c.product_count || 0)).length, icon: '🗂️', c: 'text-gray-500' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
                <span className="text-2xl">{card.icon}</span>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                  <p className={`text-lg font-bold ${card.c}`}>{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-1 focus-within:ring-indigo-300">
              <FiAlertTriangle size={13} className="text-gray-400" />
              <input
                placeholder="Search categories..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="text-sm outline-none bg-transparent"
              />
            </div>
            {isAdmin && (
              <select value={catShopFilter} onChange={(e) => setCatShopFilter(e.target.value)}
                className="rounded-lg border border-gray-200 text-sm px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option value="">All Shops</option>
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {(catSearch || catShopFilter) && (
              <button onClick={() => { setCatSearch(''); setCatShopFilter('') }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                <FiX size={13} /> Clear
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400 font-medium">{filteredCategories.length} categories</span>
          </div>

          <DataTable columns={catColumns} rows={filteredCategories} loading={false} emptyMessage="No categories found" />
        </>
      )}

      {/* ══════════ PRODUCT ADD/EDIT MODAL ══════════ */}
      <Modal
        title={editingProduct ? `Edit Product — ${editingProduct.name}` : 'Add Product'}
        open={showProductForm}
        onClose={() => setShowProductForm(false)}
      >
        <form onSubmit={handleProductSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Product Name">
            <input className={inputClass} value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
          </FormField>
          <FormField label="SKU">
            <input className={inputClass} value={productForm.SKU}
              onChange={(e) => setProductForm({ ...productForm, SKU: e.target.value.toUpperCase() })} required />
          </FormField>
          <FormField label="Barcode">
            <input className={inputClass} value={productForm.barcode}
              onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })} />
          </FormField>

          {/* Category with Create option */}
          <FormField label="Category">
            <select
              className={inputClass}
              value={productForm.category}
              onChange={(e) => handleCategorySelect(e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{catLabel(c, isAdmin)}</option>
              ))}
              {canCreate && <option value="__new__">➕ Create New Category...</option>}
            </select>
            {productForm.category && (() => {
              const sel = categories.find((c) => c.id === productForm.category)
              return sel ? (
                <p className="text-xs text-indigo-600 mt-1">
                  Selected: <strong>{sel.name}</strong>
                  {isAdmin && sel.shop_name && ` · ${sel.shop_name}`}
                </p>
              ) : null
            })()}
          </FormField>

          <FormField label="Selling Price (₹)">
            <input className={inputClass} type="number" min="0" step="0.01"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
          </FormField>
          <FormField label="Cost Price (₹)">
            <input className={inputClass} type="number" min="0" step="0.01"
              value={productForm.cost_price}
              onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })} required />
          </FormField>
          {!editingProduct && (
            <FormField label="Opening Stock">
              <input className={inputClass} type="number" min="0"
                value={productForm.initial_stock}
                onChange={(e) => setProductForm({ ...productForm, initial_stock: e.target.value })} />
            </FormField>
          )}
          <FormField label="Reorder Level">
            <input className={inputClass} type="number" min="0"
              value={productForm.reorder_level}
              onChange={(e) => setProductForm({ ...productForm, reorder_level: e.target.value })} />
          </FormField>
          <FormField label="GST %">
            <input className={inputClass} type="number" min="0" step="0.01"
              value={productForm.tax_rate}
              onChange={(e) => setProductForm({ ...productForm, tax_rate: e.target.value })} />
          </FormField>
          <FormField label="Unit">
            <input className={inputClass} value={productForm.unit}
              onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea className={inputClass} rows={3} value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowProductForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={savingProduct}
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition">
              {savingProduct ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════ QUICK CREATE CATEGORY (from product form) ══════════ */}
      <Modal title="Create New Category" open={showQuickCat} onClose={() => setShowQuickCat(false)}>
        <form onSubmit={handleQuickCatSave} className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700">
            Category will be automatically linked to your shop and selected in the product form.
          </div>
          <FormField label="Category Name">
            <input className={inputClass} value={quickCatForm.name} autoFocus
              onChange={(e) => setQuickCatForm({ ...quickCatForm, name: e.target.value })} required />
          </FormField>
          <FormField label="Description (optional)">
            <input className={inputClass} value={quickCatForm.description}
              onChange={(e) => setQuickCatForm({ ...quickCatForm, description: e.target.value })} />
          </FormField>
          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowQuickCat(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={savingQuickCat}
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition">
              {savingQuickCat ? 'Creating...' : 'Create & Select'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════ CATEGORY ADD/EDIT MODAL ══════════ */}
      <Modal
        title={editingCat ? `Edit Category — ${editingCat.name}` : 'Add Category'}
        open={showCatForm}
        onClose={() => setShowCatForm(false)}
      >
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <FormField label="Category Name">
            <input className={inputClass} value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required />
          </FormField>
          <FormField label="Description">
            <textarea className={inputClass} rows={3} value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
          </FormField>
          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowCatForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={savingCat}
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition">
              {savingCat ? 'Saving...' : editingCat ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InventoryPage
