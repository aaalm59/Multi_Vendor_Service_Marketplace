import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  FiPlus, FiEdit2, FiTrash2, FiDownload, FiX, FiTag, FiStar,
} from 'react-icons/fi'
import { useSelector } from 'react-redux'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import PageToolbar from '../components/PageToolbar'
import { serviceAPI, serviceCategoryAPI, shopAPI } from '../services/api'
import { canAccess, canDo, roleGroups } from '../routes/rbac'
import { downloadCSV } from '../utils/exportCSV'

const DEFAULT_CATEGORIES = [
  { label: 'Fan Repair', icon: '🌀' },
  { label: 'AC Repair', icon: '❄️' },
  { label: 'CCTV Installation', icon: '📷' },
  { label: 'Wiring Repair', icon: '🔌' },
  { label: 'Inverter Service', icon: '🔋' },
  { label: 'LED Installation', icon: '💡' },
  { label: 'Motor Pump Repair', icon: '⚙️' },
]

const emptyForm = {
  name: '', description: '', base_price: '', gst_rate: '18',
  estimated_duration: '60', is_available: true, is_featured: false,
  category: '', tags: '',
}

const emptyCatForm = { name: '', description: '', icon: '🔧' }

const ServicesPage = () => {
  const { user } = useSelector((state) => state.auth)
  const isAdmin = user?.role === 'admin'

  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [shops, setShops] = useState([])
  const [analytics, setAnalytics] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedShop, setSelectedShop] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')  // all | available | unavailable
  const [featuredOnly, setFeaturedOnly] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const [showCatForm, setShowCatForm] = useState(false)
  const [catForm, setCatForm] = useState(emptyCatForm)
  const [savingCat, setSavingCat] = useState(false)

  const canCreate = canAccess(user, roleGroups.management, 'services') && canDo(user, 'services', 'create')
  const canEdit   = canAccess(user, roleGroups.management, 'services') && canDo(user, 'services', 'update')
  const canDelete = canAccess(user, roleGroups.management, 'services') && canDo(user, 'services', 'delete')
  const canExport = canAccess(user, roleGroups.management, 'services') && canDo(user, 'services', 'export_csv')

  useEffect(() => { loadServices() }, [search, selectedShop])

  useEffect(() => {
    loadCategories()
    if (isAdmin) {
      shopAPI.getAll({ limit: 100 })
        .then((r) => setShops(r.data.results || r.data || []))
        .catch(() => {})
      fetchAnalytics()
    }
  }, [isAdmin])

  const fetchAnalytics = () => {
    serviceAPI.getServiceAnalytics()
      .then((r) => setAnalytics(r.data || []))
      .catch(() => {})
  }

  const loadCategories = () => {
    serviceCategoryAPI.getAll()
      .then((r) => setCategories(r.data.results || r.data || []))
      .catch(() => {})
  }

  const loadServices = async () => {
    setLoading(true)
    try {
      const params = { limit: 300, ordering: 'name' }
      if (search) params.search = search
      if (selectedShop) params.shop = selectedShop
      const res = await serviceAPI.getAll(params)
      setServices(res.data.results || res.data || [])
    } catch { toast.error('Services load failed') }
    finally { setLoading(false) }
  }

  const filteredServices = useMemo(() => {
    let result = services
    if (selectedCategory) result = result.filter((s) => s.category?.id === selectedCategory)
    if (statusFilter === 'available') result = result.filter((s) => s.is_available)
    if (statusFilter === 'unavailable') result = result.filter((s) => !s.is_available)
    if (featuredOnly) result = result.filter((s) => s.is_featured)
    return result
  }, [services, selectedCategory, statusFilter, featuredOnly])

  const stats = useMemo(() => {
    const total = filteredServices.length
    const available = filteredServices.filter((s) => s.is_available).length
    const featured = filteredServices.filter((s) => s.is_featured).length
    const avgPrice = total
      ? Math.round(filteredServices.reduce((acc, s) => acc + Number(s.base_price || 0), 0) / total)
      : 0
    return { total, available, featured, avgPrice }
  }, [filteredServices])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({
      name: s.name,
      description: s.description || '',
      base_price: s.base_price,
      gst_rate: s.gst_rate ?? '18',
      estimated_duration: s.estimated_duration,
      is_available: s.is_available,
      is_featured: s.is_featured || false,
      category: s.category?.id || '',
      tags: s.tags || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        base_price: Number(form.base_price),
        gst_rate: Number(form.gst_rate || 0),
        estimated_duration: Number(form.estimated_duration),
        category: form.category || null,
      }
      if (editing) {
        await serviceAPI.update(editing.id, payload)
        toast.success('Service updated')
      } else {
        await serviceAPI.create(payload)
        toast.success('Service created')
      }
      setShowForm(false)
      loadServices()
      if (isAdmin) fetchAnalytics()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.name}"?`)) return
    try {
      await serviceAPI.delete(s.id)
      toast.success('Service deleted')
      loadServices()
      if (isAdmin) fetchAnalytics()
    } catch { toast.error('Delete failed — service may have linked bookings') }
  }

  const handleSaveCategory = async (e) => {
    e.preventDefault()
    setSavingCat(true)
    try {
      await serviceCategoryAPI.create(catForm)
      toast.success('Category created')
      setShowCatForm(false)
      setCatForm(emptyCatForm)
      loadCategories()
    } catch { toast.error('Category save failed') }
    finally { setSavingCat(false) }
  }

  const handleExport = () => {
    const cols = [
      { key: 'name', label: 'Service Name' },
      ...(isAdmin ? [{ key: 'shop_name', label: 'Shop' }, { key: 'shop_owner', label: 'Owner' }] : []),
      { key: 'category', label: 'Category', getValue: (r) => r.category?.name || '' },
      { key: 'base_price', label: 'Base Price (₹)' },
      { key: 'gst_rate', label: 'GST %' },
      { key: 'price_with_gst', label: 'Price with GST (₹)' },
      { key: 'estimated_duration', label: 'Duration (min)' },
      { key: 'tags', label: 'Tags' },
      { key: 'is_available', label: 'Available', getValue: (r) => r.is_available ? 'Yes' : 'No' },
      { key: 'is_featured', label: 'Featured', getValue: (r) => r.is_featured ? 'Yes' : 'No' },
    ]
    downloadCSV(filteredServices, cols, 'services')
    toast.success('Services CSV downloaded')
  }

  const clearFilters = () => {
    setSelectedShop(''); setSelectedCategory(''); setStatusFilter('all'); setFeaturedOnly(false)
  }
  const hasFilters = selectedShop || selectedCategory || statusFilter !== 'all' || featuredOnly

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
      key: 'name', label: 'Service',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-900">{r.name}</span>
              {r.is_featured && (
                <FiStar size={12} className="text-yellow-500 fill-yellow-400" />
              )}
            </div>
            {r.tags && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {r.tags.split(',').slice(0, 3).map((t) => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {t.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category', label: 'Category',
      render: (r) => r.category?.name
        ? (
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {r.category.icon || '🔧'} {r.category.name}
          </span>
        )
        : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: 'base_price', label: 'Price',
      render: (r) => (
        <div>
          <p className="font-semibold text-gray-900">₹{parseFloat(r.base_price).toLocaleString()}</p>
          <p className="text-xs text-gray-400">+{r.gst_rate}% GST</p>
        </div>
      ),
    },
    {
      key: 'price_with_gst', label: 'Total (incl. GST)',
      render: (r) => (
        <span className="text-sm font-bold text-green-700">
          ₹{parseFloat(r.price_with_gst || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      key: 'estimated_duration', label: 'Duration',
      render: (r) => (
        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
          ⏱ {r.estimated_duration} min
        </span>
      ),
    },
    {
      key: 'booking_count', label: 'Bookings',
      render: (r) => (
        <span className="text-sm font-bold text-gray-700">{r.booking_count ?? 0}</span>
      ),
    },
    {
      key: 'is_available', label: 'Status',
      render: (r) => r.is_available
        ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            ● Available
          </span>
        )
        : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
            ● Offline
          </span>
        ),
    },
    (canEdit || canDelete) && {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5">
          {canEdit && (
            <button
              onClick={() => openEdit(r)}
              className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition"
              title="Edit"
            >
              <FiEdit2 size={13} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDelete(r)}
              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
              title="Delete"
            >
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
          title="Service Catalog"
          subtitle={isAdmin ? 'Shop-wise services — all shops overview' : 'Bookable electric repair services with pricing and duration'}
          search={search}
          onSearch={setSearch}
          actionLabel={canCreate ? 'Add Service' : undefined}
          actionIcon={FiPlus}
          onAction={openCreate}
        />
        <div className="flex gap-2 flex-wrap">
          {canCreate && (
            <button
              onClick={() => setShowCatForm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              <FiTag size={14} /> Add Category
            </button>
          )}
          {canExport && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              <FiDownload size={14} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Services', value: stats.total, icon: '🔧', textColor: 'text-indigo-700' },
          { label: 'Available', value: stats.available, icon: '✅', textColor: 'text-green-700' },
          { label: 'Featured', value: stats.featured, icon: '⭐', textColor: 'text-yellow-600' },
          { label: 'Avg Price', value: `₹${stats.avgPrice.toLocaleString()}`, icon: '💰', textColor: 'text-blue-700' },
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
                  className={`flex-shrink-0 cursor-pointer rounded-xl border p-4 min-w-[200px] transition-all select-none
                    ${active
                      ? 'border-indigo-400 bg-indigo-50 shadow-md ring-1 ring-indigo-300'
                      : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-start justify-between mb-1 gap-1">
                    <p className="text-xs font-bold text-indigo-800 leading-tight truncate">{a.shop_name}</p>
                    <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">
                      {a.available_services}/{a.total_services}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mb-2">{a.shop_owner || 'No owner'}</p>
                  <div className="grid grid-cols-2 gap-1.5 text-center">
                    <div className="bg-white rounded-lg p-1.5 border border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{a.total_services}</p>
                      <p className="text-xs text-gray-400">Services</p>
                    </div>
                    <div className="bg-white rounded-lg p-1.5 border border-gray-100">
                      <p className="text-sm font-bold text-gray-900">
                        ₹{parseFloat(a.avg_price).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-gray-400">Avg Price</p>
                    </div>
                  </div>
                  {a.featured_services > 0 && (
                    <p className="text-xs text-yellow-600 mt-2 text-center font-medium">
                      ⭐ {a.featured_services} featured
                    </p>
                  )}
                  {a.most_booked && (
                    <p className="text-xs text-gray-400 mt-1 text-center truncate">
                      🔥 {a.most_booked}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Categories Quick View */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition
              ${!selectedCategory ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(selectedCategory === c.id ? '' : c.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition
                ${selectedCategory === c.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
            >
              {c.icon || '🔧'} {c.name}
              {c.service_count > 0 && (
                <span className={`ml-0.5 px-1 rounded-full text-xs ${selectedCategory === c.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {c.service_count}
                </span>
              )}
            </button>
          ))}
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 text-sm px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="unavailable">Offline</option>
        </select>
        <button
          onClick={() => setFeaturedOnly(!featuredOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition
            ${featuredOnly ? 'bg-yellow-50 border-yellow-400 text-yellow-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <FiStar size={13} /> Featured Only
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
          {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={filteredServices}
        loading={loading}
        emptyMessage="No services found"
      />

      {/* Add / Edit Service Modal */}
      <Modal
        title={editing ? `Edit Service — ${editing.name}` : 'Add Service'}
        open={showForm}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Service Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Category">
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Base Price (₹)">
            <input
              className={inputClass} type="number" min="0" step="0.01"
              value={form.base_price}
              onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              required
            />
          </FormField>
          <FormField label="GST %">
            <input
              className={inputClass} type="number" min="0" step="0.01"
              value={form.gst_rate}
              onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}
            />
          </FormField>
          <FormField label="Duration (minutes)">
            <input
              className={inputClass} type="number" min="1"
              value={form.estimated_duration}
              onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Tags (comma-separated)">
            <input
              className={inputClass}
              placeholder="e.g. electrical, repair, urgent"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </FormField>
          <FormField label="Status">
            <select
              className={inputClass}
              value={form.is_available ? 'yes' : 'no'}
              onChange={(e) => setForm({ ...form, is_available: e.target.value === 'yes' })}
            >
              <option value="yes">Available</option>
              <option value="no">Offline</option>
            </select>
          </FormField>
          <FormField label="Featured">
            <select
              className={inputClass}
              value={form.is_featured ? 'yes' : 'no'}
              onChange={(e) => setForm({ ...form, is_featured: e.target.value === 'yes' })}
            >
              <option value="no">No</option>
              <option value="yes">⭐ Yes — Show as Featured</option>
            </select>
          </FormField>

          {/* Price preview */}
          {form.base_price && (
            <div className="md:col-span-2 bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-xs text-green-700 font-medium">
                Price preview: ₹{Number(form.base_price).toLocaleString()}
                {form.gst_rate > 0 && ` + ₹${(Number(form.base_price) * Number(form.gst_rate) / 100).toFixed(2)} GST`}
                {' = '}
                <strong>
                  ₹{(Number(form.base_price) * (1 + Number(form.gst_rate || 0) / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </strong>
              </p>
            </div>
          )}

          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea
                className={inputClass} rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
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
              {saving ? 'Saving...' : editing ? 'Update Service' : 'Save Service'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal title="Add Service Category" open={showCatForm} onClose={() => setShowCatForm(false)}>
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {DEFAULT_CATEGORIES.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setCatForm({ ...catForm, name: c.label, icon: c.icon })}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition
                  ${catForm.name === c.label ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <span className="text-lg">{c.icon}</span>
                <span className="leading-tight text-center">{c.label}</span>
              </button>
            ))}
          </div>
          <FormField label="Category Name">
            <input
              className={inputClass}
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              required
            />
          </FormField>
          <div className="flex gap-3">
            <FormField label="Icon (emoji)">
              <input
                className={inputClass}
                value={catForm.icon}
                onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
              />
            </FormField>
            <FormField label="Description">
              <input
                className={inputClass}
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => setShowCatForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={savingCat}
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition"
            >
              {savingCat ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ServicesPage
