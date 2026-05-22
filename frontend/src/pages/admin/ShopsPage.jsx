import React, { useEffect, useRef, useState } from 'react'
import {
  FiShoppingBag, FiCheck, FiX, FiPause, FiSearch, FiPlus, FiRefreshCw,
  FiMapPin, FiPhone, FiMail, FiUser, FiUserPlus, FiKey, FiCopy, FiEye, FiEyeOff,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { shopAPI, userAPI } from '../../services/api'
import Modal from '../../components/Modal'
import FormField, { inputClass } from '../../components/FormField'

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
        <button onClick={() => onAction(shop.id, 'approve')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors">
          <FiCheck size={12} /> Approve
        </button>
      )}
      {shop.status !== 'rejected' && shop.status !== 'suspended' && (
        <button onClick={() => onAction(shop.id, 'reject')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors">
          <FiX size={12} /> Reject
        </button>
      )}
      {shop.status === 'approved' && (
        <button onClick={() => onAction(shop.id, 'suspend')} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors">
          <FiPause size={12} /> Suspend
        </button>
      )}
    </div>
  </div>
)

// Generates a random secure-looking temporary password
const genPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$'
  const all = upper + lower + digits + special
  const rand = (s) => s[Math.floor(Math.random() * s.length)]
  const core = Array.from({ length: 8 }, () => rand(all)).join('')
  return rand(upper) + rand(digits) + rand(special) + core
}

const EMPTY_FORM = {
  name: '', phone: '', email: '', address: '', landmark: '', area: '',
  city: '', state: '', pincode: '', gst_number: '', owner: '',
}

const EMPTY_SOP = { first_name: '', last_name: '', email: '', phone: '', password: '' }

// Credentials popup shown after SOP user is created
const CredsModal = ({ creds, onClose }) => {
  const [showPwd, setShowPwd] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyAll = () => {
    const text = `Name: ${creds.name}\nEmail: ${creds.email}\nPassword: ${creds.password}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Credentials copied to clipboard')
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <FiKey size={16} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">SOP User Created</h3>
              <p className="text-xs text-gray-500">Save these credentials before closing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><FiX size={16} /></button>
        </div>

        {/* Credential fields */}
        <div className="space-y-3 mb-5">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Full Name</p>
            <p className="text-sm font-semibold text-gray-800">{creds.name}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Email / Login</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{creds.email}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(creds.email); toast.success('Email copied') }}
              className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 flex-shrink-0"
            ><FiCopy size={14} /></button>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-0.5">Temporary Password</p>
              <p className="text-sm font-bold text-gray-900 font-mono tracking-widest">
                {showPwd ? creds.password : '•'.repeat(creds.password.length)}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => setShowPwd(v => !v)} className="p-1.5 rounded-lg hover:bg-yellow-100 text-yellow-600">
                {showPwd ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(creds.password); toast.success('Password copied') }} className="p-1.5 rounded-lg hover:bg-yellow-100 text-yellow-600">
                <FiCopy size={14} />
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-4 text-center">
          Ask the shop owner to change their password after first login.
        </p>

        <div className="flex gap-2">
          <button
            onClick={copyAll}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition border ${
              copied ? 'bg-green-500 text-white border-green-500' : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
            }`}
          >
            <FiCopy size={14} />
            {copied ? 'Copied!' : 'Copy All Credentials'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

const ShopsPage = () => {
  const [allShops, setAllShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [sopUsers, setSopUsers] = useState([])

  // SOP user search inside dropdown
  const [sopSearch, setSopSearch] = useState('')
  const [showSopDropdown, setShowSopDropdown] = useState(false)
  const sopDropdownRef = useRef(null)

  // Inline SOP creation
  const [showCreateSop, setShowCreateSop] = useState(false)
  const [newSop, setNewSop] = useState(EMPTY_SOP)
  const [creatingSop, setCreatingSop] = useState(false)
  const [showSopPwd, setShowSopPwd] = useState(false)

  // Credentials popup
  const [createdCreds, setCreatedCreds] = useState(null)

  const fetchShops = async () => {
    setLoading(true)
    try {
      const res = await shopAPI.getAll({})
      setAllShops(res.data?.results || res.data || [])
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
    } catch { /* silent */ }
  }

  useEffect(() => { fetchShops() }, [])
  useEffect(() => { fetchSopUsers() }, [])

  // Close SOP dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sopDropdownRef.current && !sopDropdownRef.current.contains(e.target))
        setShowSopDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const shops = allShops.filter(s => {
    const matchStatus = !statusFilter || s.status === statusFilter
    if (!matchStatus) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.name?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.owner_name?.toLowerCase().includes(q)
    )
  })

  const counts = {
    all: allShops.length,
    approved: allShops.filter(s => s.status === 'approved').length,
    pending: allShops.filter(s => s.status === 'pending').length,
    suspended: allShops.filter(s => s.status === 'suspended').length,
  }

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
      resetSopPanel()
      setStatusFilter('')
      fetchShops()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Failed to create shop')
    } finally {
      setSaving(false)
    }
  }

  const resetSopPanel = () => {
    setShowCreateSop(false)
    setNewSop(EMPTY_SOP)
    setShowSopPwd(false)
    setSopSearch('')
    setShowSopDropdown(false)
  }

  const handleAutoGenPassword = () => {
    const pwd = genPassword()
    setNewSop(p => ({ ...p, password: pwd }))
    setShowSopPwd(true)
  }

  const handleCreateSopUser = async () => {
    if (!newSop.first_name.trim()) { toast.error('First name is required'); return }
    if (!newSop.email.trim()) { toast.error('Email is required'); return }
    if (!newSop.password || newSop.password.length < 8) { toast.error('Password must be at least 8 characters'); return }

    setCreatingSop(true)
    try {
      const res = await userAPI.create({
        first_name: newSop.first_name.trim(),
        last_name: newSop.last_name.trim(),
        email: newSop.email.trim(),
        phone: newSop.phone.trim(),
        password: newSop.password,
        role: 'sop_user',
      })
      const created = res.data
      setSopUsers(prev => [...prev, created])
      setForm(prev => ({ ...prev, owner: String(created.id) }))

      const fullName = [created.first_name, created.last_name].filter(Boolean).join(' ')
      setCreatedCreds({ name: fullName || created.email, email: created.email, password: newSop.password })

      toast.success(`SOP user "${fullName || created.email}" created and selected`)
      resetSopPanel()
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | ')
        toast.error(msgs)
      } else {
        toast.error('Failed to create SOP user')
      }
    } finally {
      setCreatingSop(false)
    }
  }

  // Filtered SOP users for searchable dropdown
  const filteredSopUsers = sopUsers.filter(u => {
    if (!sopSearch) return true
    const q = sopSearch.toLowerCase()
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  })

  const selectedSopUser = sopUsers.find(u => String(u.id) === String(form.owner))

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
          <p>{statusFilter || search ? 'No shops match the current filter' : 'No shops found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map(shop => (
            <ShopCard key={shop.id} shop={shop} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* ── Create Shop Modal ─────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); resetSopPanel() }} title="Create New Shop">
        <form onSubmit={handleCreate} className="space-y-5">

          {/* ── Shop Owner section ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800">Shop Owner (SOP User)</p>
                <p className="text-xs text-gray-500 mt-0.5">Select an existing user or create a new one</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateSop(v => !v)
                  if (!showCreateSop) {
                    setForm(p => ({ ...p, owner: '' }))
                    setSopSearch('')
                    setShowSopDropdown(false)
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                  showCreateSop
                    ? 'bg-gray-200 border-gray-300 text-gray-600'
                    : 'bg-yellow-400 border-yellow-400 text-black hover:bg-yellow-500'
                }`}
              >
                {showCreateSop ? <><FiX size={12} /> Cancel</> : <><FiUserPlus size={12} /> New SOP User</>}
              </button>
            </div>

            {/* Searchable owner dropdown — shown when not creating */}
            {!showCreateSop && (
              <div className="relative" ref={sopDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowSopDropdown(v => !v)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm bg-white transition ${
                    showSopDropdown ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={selectedSopUser ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                    {selectedSopUser
                      ? `${[selectedSopUser.first_name, selectedSopUser.last_name].filter(Boolean).join(' ')} (${selectedSopUser.email})`
                      : '— Select SOP User —'
                    }
                  </span>
                  <FiSearch size={14} className="text-gray-400 flex-shrink-0" />
                </button>

                {showSopDropdown && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {/* Search input inside dropdown */}
                    <div className="p-2 border-b border-gray-100">
                      <input
                        autoFocus
                        value={sopSearch}
                        onChange={e => setSopSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => { setForm(p => ({ ...p, owner: '' })); setShowSopDropdown(false); setSopSearch('') }}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 italic"
                      >
                        — No owner (assign later) —
                      </button>
                      {filteredSopUsers.length === 0 ? (
                        <div className="px-3 py-4 text-center">
                          <p className="text-sm text-gray-400">No users found</p>
                          <button
                            type="button"
                            onClick={() => { setShowSopDropdown(false); setShowCreateSop(true) }}
                            className="mt-1.5 text-xs text-yellow-600 font-semibold hover:underline"
                          >
                            + Create New SOP User
                          </button>
                        </div>
                      ) : (
                        filteredSopUsers.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => { setForm(p => ({ ...p, owner: String(u.id) })); setShowSopDropdown(false); setSopSearch('') }}
                            className={`w-full text-left px-3 py-2.5 hover:bg-yellow-50 transition ${String(form.owner) === String(u.id) ? 'bg-yellow-50' : ''}`}
                          >
                            <p className="text-sm font-semibold text-gray-800">
                              {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}
                              {String(form.owner) === String(u.id) && <FiCheck size={13} className="inline ml-2 text-yellow-500" />}
                            </p>
                            <p className="text-xs text-gray-400">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Show selected badge */}
                {selectedSopUser && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                    <FiCheck size={11} />
                    <span>Selected: <strong>{[selectedSopUser.first_name, selectedSopUser.last_name].filter(Boolean).join(' ')}</strong></span>
                    <button type="button" onClick={() => setForm(p => ({ ...p, owner: '' }))} className="ml-auto text-gray-400 hover:text-gray-600"><FiX size={11} /></button>
                  </div>
                )}

                {sopUsers.length === 0 && !selectedSopUser && (
                  <p className="mt-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    No SOP users yet. Click <strong>New SOP User</strong> to create one.
                  </p>
                )}
              </div>
            )}

            {/* ── Inline SOP creation panel ── */}
            {showCreateSop && (
              <div
                className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 space-y-3"
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FiUserPlus size={14} className="text-yellow-600" />
                  <p className="text-sm font-bold text-gray-800">Create New SOP User</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                    <input
                      className={inputClass}
                      placeholder="First name"
                      value={newSop.first_name}
                      onChange={e => setNewSop(p => ({ ...p, first_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                    <input
                      className={inputClass}
                      placeholder="Last name"
                      value={newSop.last_name}
                      onChange={e => setNewSop(p => ({ ...p, last_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                    <input
                      className={inputClass}
                      type="email"
                      placeholder="owner@example.com"
                      value={newSop.email}
                      onChange={e => setNewSop(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                    <input
                      className={inputClass}
                      type="tel"
                      placeholder="Mobile number"
                      value={newSop.phone}
                      maxLength={15}
                      onChange={e => setNewSop(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Password *</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          className={inputClass + ' pr-9'}
                          type={showSopPwd ? 'text' : 'password'}
                          placeholder="Min 8 characters"
                          value={newSop.password}
                          onChange={e => setNewSop(p => ({ ...p, password: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSopPwd(v => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showSopPwd ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoGenPassword}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                        title="Auto-generate a secure password"
                      >
                        <FiKey size={12} /> Auto-generate
                      </button>
                    </div>
                    {newSop.password && newSop.password.length < 8 && (
                      <p className="mt-1 text-xs text-red-500">Password must be at least 8 characters</p>
                    )}
                  </div>
                </div>

                {/* Role badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">Role: Shop Owner (SOP User)</span>
                  <span className="text-xs text-gray-400">— auto-assigned</span>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetSopPanel}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSopUser}
                    disabled={creatingSop}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:opacity-60 transition"
                  >
                    {creatingSop
                      ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                      : <><FiCheck size={13} /> Create &amp; Select</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Shop Details ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Shop Name *">
              <input className={inputClass} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. Bharat Electric" />
            </FormField>
            <FormField label="Phone">
              <input className={inputClass} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} maxLength={15} placeholder="Contact number" />
            </FormField>
            <FormField label="Email">
              <input className={inputClass} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="shop@example.com" />
            </FormField>
            <FormField label="GST Number">
              <input className={inputClass} value={form.gst_number} onChange={e => setForm(p => ({ ...p, gst_number: e.target.value }))} maxLength={20} placeholder="22AAAAA0000A1Z5" />
            </FormField>
            <FormField label="City">
              <input className={inputClass} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="City" />
            </FormField>
            <FormField label="State">
              <input className={inputClass} value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="State" />
            </FormField>
            <FormField label="Pincode">
              <input className={inputClass} value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} maxLength={10} placeholder="Pincode" />
            </FormField>
            <FormField label="Area">
              <input className={inputClass} value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} placeholder="Area / Colony" />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Landmark">
                <input className={inputClass} value={form.landmark} onChange={e => setForm(p => ({ ...p, landmark: e.target.value }))} placeholder="Near landmark" />
              </FormField>
            </div>
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

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); resetSopPanel() }}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-yellow-400 text-black rounded-xl text-sm font-bold hover:bg-yellow-500 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Creating...' : 'Create Shop'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Credentials popup — shown after SOP user creation ── */}
      {createdCreds && (
        <CredsModal creds={createdCreds} onClose={() => setCreatedCreds(null)} />
      )}
    </div>
  )
}

export default ShopsPage
