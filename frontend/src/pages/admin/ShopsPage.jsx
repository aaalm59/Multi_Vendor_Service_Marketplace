import React, { useEffect, useState } from 'react'
import { FiShoppingBag, FiCheck, FiX, FiPause, FiSearch, FiPlus, FiRefreshCw, FiMapPin, FiPhone, FiMail, FiUser } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { shopAPI, userAPI } from '../../services/api'
import Modal from '../../components/Modal'
import FormField, { inputClass } from '../../components/FormField'
import StatusBadge from '../../components/StatusBadge'

const STATUS_COLOR = {
  approved: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  suspended: 'bg-gray-100 text-gray-600 border-gray-200',
}

const ShopCard = ({ shop, onAction }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {shop.shop_logo ? (
          <img src={shop.shop_logo} alt={shop.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <FiShoppingBag size={22} className="text-black" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{shop.name}</h3>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium mt-0.5 ${STATUS_COLOR[shop.status] || STATUS_COLOR.pending}`}>
            {shop.status}
          </span>
        </div>
      </div>
    </div>

    <div className="space-y-1.5 text-sm text-gray-600 mb-4">
      {shop.owner_name && (
        <p className="flex items-center gap-2"><FiUser size={13} className="text-gray-400" /> {shop.owner_name}</p>
      )}
      {shop.phone && (
        <p className="flex items-center gap-2"><FiPhone size={13} className="text-gray-400" /> {shop.phone}</p>
      )}
      {shop.email && (
        <p className="flex items-center gap-2"><FiMail size={13} className="text-gray-400" /> {shop.email}</p>
      )}
      {(shop.city || shop.state) && (
        <p className="flex items-center gap-2"><FiMapPin size={13} className="text-gray-400" /> {[shop.city, shop.state].filter(Boolean).join(', ')}</p>
      )}
      {shop.gst_number && (
        <p className="text-xs text-gray-400">GST: {shop.gst_number}</p>
      )}
    </div>

    <div className="flex gap-2 flex-wrap">
      {shop.status !== 'approved' && (
        <button
          onClick={() => onAction(shop.id, 'approve')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors"
        >
          <FiCheck size={12} /> Approve
        </button>
      )}
      {shop.status !== 'rejected' && shop.status !== 'suspended' && (
        <button
          onClick={() => onAction(shop.id, 'reject')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors"
        >
          <FiX size={12} /> Reject
        </button>
      )}
      {shop.status === 'approved' && (
        <button
          onClick={() => onAction(shop.id, 'suspend')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors"
        >
          <FiPause size={12} /> Suspend
        </button>
      )}
    </div>
  </div>
)

const EMPTY_FORM = {
  name: '', phone: '', email: '', address: '', landmark: '', area: '',
  city: '', state: '', pincode: '', gst_number: '', owner: '',
}

const ShopsPage = () => {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [sopUsers, setSopUsers] = useState([])

  const fetchShops = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (search) params.search = search
      const res = await shopAPI.getAll(params)
      setShops(res.data?.results || res.data || [])
    } catch {
      toast.error('Failed to load shops')
    } finally {
      setLoading(false)
    }
  }

  const fetchSopUsers = async () => {
    try {
      const res = await userAPI.getByRole('sop_user')
      setSopUsers(res.data?.results || res.data || [])
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchShops() }, [search, statusFilter])
  useEffect(() => { fetchSopUsers() }, [])

  const handleAction = async (shopId, action) => {
    try {
      if (action === 'approve') await shopAPI.approve(shopId)
      else if (action === 'reject') await shopAPI.reject(shopId)
      else if (action === 'suspend') await shopAPI.suspend(shopId)
      toast.success(`Shop ${action}d successfully`)
      fetchShops()
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${action} shop`)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.owner) delete payload.owner
      await shopAPI.create(payload)
      toast.success('Shop created successfully')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      fetchShops()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Failed to create shop')
    } finally {
      setSaving(false)
    }
  }

  const counts = {
    all: shops.length,
    approved: shops.filter(s => s.status === 'approved').length,
    pending: shops.filter(s => s.status === 'pending').length,
    suspended: shops.filter(s => s.status === 'suspended').length,
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <FiShoppingBag size={20} className="text-black" />
          </div>
          <div>
            <h1 className="text-gray-900 text-xl font-bold">Shop Management</h1>
            <p className="text-gray-500 text-sm">Manage all shops on the platform</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-xl font-semibold text-sm hover:bg-yellow-500 transition-colors"
        >
          <FiPlus size={16} /> Create Shop
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { key: '', label: 'Total Shops', count: counts.all, color: 'border-gray-200' },
          { key: 'approved', label: 'Active', count: counts.approved, color: 'border-green-200' },
          { key: 'pending', label: 'Pending', count: counts.pending, color: 'border-yellow-200' },
          { key: 'suspended', label: 'Suspended', count: counts.suspended, color: 'border-red-200' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`bg-white border-2 rounded-xl p-4 text-center transition-all hover:shadow-sm ${statusFilter === s.key ? s.color + ' shadow-sm' : 'border-gray-100'}`}
          >
            <p className="text-2xl font-bold text-gray-900">{s.count}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shops by name, city, owner..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
          />
        </div>
        <button onClick={fetchShops} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
          <FiRefreshCw size={16} />
        </button>
      </div>

      {/* Shop grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading shops...</div>
      ) : shops.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
          <p>No shops found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map(shop => (
            <ShopCard key={shop.id} shop={shop} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* Create Shop Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Shop">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Shop Name *">
              <input className={inputClass} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </FormField>
            <FormField label="Shop Owner (SOP User)">
              <select
                value={form.owner}
                onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
                className={inputClass}
              >
                <option value="">-- Select SOP User --</option>
                {sopUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
                ))}
              </select>
            </FormField>
            <FormField label="Phone">
              <input className={inputClass} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </FormField>
            <FormField label="Email">
              <input className={inputClass} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </FormField>
            <FormField label="GST Number">
              <input className={inputClass} value={form.gst_number} onChange={e => setForm(p => ({ ...p, gst_number: e.target.value }))} />
            </FormField>
            <FormField label="City">
              <input className={inputClass} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            </FormField>
            <FormField label="State">
              <input className={inputClass} value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
            </FormField>
            <FormField label="Pincode">
              <input className={inputClass} value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} />
            </FormField>
            <FormField label="Area">
              <input className={inputClass} value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} />
            </FormField>
            <FormField label="Landmark">
              <input className={inputClass} value={form.landmark} onChange={e => setForm(p => ({ ...p, landmark: e.target.value }))} />
            </FormField>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 resize-none"
              placeholder="Full address..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-yellow-400 text-black rounded-xl text-sm font-bold hover:bg-yellow-500 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Shop'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ShopsPage
