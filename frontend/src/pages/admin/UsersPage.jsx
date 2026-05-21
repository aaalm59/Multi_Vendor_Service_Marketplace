import React, { useEffect, useState, useMemo } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiUserCheck, FiUserX, FiDownload, FiSearch, FiShield } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { userAPI, shopAPI } from '../../services/api'
import Modal from '../../components/Modal'
import FormField, { inputClass } from '../../components/FormField'
import { downloadCSV } from '../../utils/exportCSV'

const ROLES = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'sop_user', label: 'Shop Owner (SOP)' },
  { value: 'manager', label: 'Manager' },
  { value: 'technician', label: 'Technician' },
  { value: 'sales_staff', label: 'Sales Staff' },
  { value: 'inventory_staff', label: 'Inventory Staff' },
  { value: 'customer', label: 'Customer' },
]

const roleColors = {
  admin: 'bg-red-100 text-red-700',
  sop_user: 'bg-yellow-100 text-yellow-800',
  manager: 'bg-blue-100 text-blue-700',
  technician: 'bg-purple-100 text-purple-700',
  sales_staff: 'bg-green-100 text-green-700',
  inventory_staff: 'bg-orange-100 text-orange-700',
  customer: 'bg-gray-100 text-gray-600',
}

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'customer',
  shop: '',
  password: '',
  is_active: true,
}

const AdminUsersPage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null) // user object or null = create
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [toggling, setToggling] = useState(null) // user id being toggled
  const [shops, setShops] = useState([])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = { limit: 200, ordering: '-created_at' }
      if (roleFilter) params.role = roleFilter
      if (search) params.search = search
      const res = await userAPI.getAll(params)
      setUsers(res.data.results || res.data || [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [search, roleFilter])

  useEffect(() => {
    shopAPI.getAll({ limit: 200 })
      .then(res => setShops(res.data?.results || res.data || []))
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (user) => {
    setEditing(user)
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'customer',
      shop: user.shop || '',
      password: '',
      is_active: user.is_active !== false,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await userAPI.update(editing.id, {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          role: form.role,
          is_active: form.is_active,
        })
        toast.success('User updated')
      } else {
        if (!form.password) { toast.error('Password is required'); setSaving(false); return }
        const payload = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          password: form.password,
        }
        if (form.shop) payload.shop = form.shop
        await userAPI.create(payload)
        toast.success('User created')
      }
      setShowModal(false)
      loadUsers()
    } catch (error) {
      toast.error(
        error.response?.data?.email?.[0] ||
        error.response?.data?.password?.[0] ||
        error.response?.data?.detail ||
        'Operation failed'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.email}"? This cannot be undone.`)) return
    try {
      await userAPI.delete(user.id)
      toast.success('User deleted')
      loadUsers()
    } catch {
      toast.error('Delete failed — user may have related records')
    }
  }

  const handleToggleActive = async (user) => {
    setToggling(user.id)
    try {
      if (user.is_active) {
        await userAPI.deactivate(user.id)
        toast.success(`${user.first_name || user.email} deactivated`)
      } else {
        await userAPI.activate(user.id)
        toast.success(`${user.first_name || user.email} activated`)
      }
      loadUsers()
    } catch {
      toast.error('Status update failed')
    } finally {
      setToggling(null)
    }
  }

  const summary = useMemo(() => {
    const byRole = {}
    users.forEach((u) => { byRole[u.role] = (byRole[u.role] || 0) + 1 })
    return {
      total: users.length,
      active: users.filter((u) => u.is_active).length,
      inactive: users.filter((u) => !u.is_active).length,
      byRole,
    }
  }, [users])

  const handleExportCSV = () => {
    downloadCSV(users, [
      { key: 'id', label: 'ID' },
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'role', label: 'Role' },
      { key: 'is_active', label: 'Active', getValue: (r) => r.is_active ? 'Yes' : 'No' },
      { key: 'created_at', label: 'Joined', getValue: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '' },
    ], 'users')
    toast.success('Users CSV downloaded')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 p-1.5 rounded-lg">
              <FiShield size={16} className="text-black" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Admin control — create, edit, assign roles, activate/deactivate all system users</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            <FiDownload size={14} /> Export CSV
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm transition shadow-sm"
          >
            <FiPlus size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-950 rounded-xl p-4 text-white">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Total Users</p>
          <p className="text-3xl font-bold text-yellow-400 mt-1">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Active</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{summary.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Inactive</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{summary.inactive}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Roles</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{Object.keys(summary.byRole).length}</p>
        </div>
      </div>

      {/* Role breakdown chips */}
      <div className="flex flex-wrap gap-2">
        {ROLES.filter((r) => r.value).map((r) => (
          <div key={r.value} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${roleColors[r.value] || 'bg-gray-100 text-gray-600'}`}>
            {r.label}
            <span className="bg-white/60 px-1.5 py-0.5 rounded-full font-bold">{summary.byRole[r.value] || 0}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm min-w-[220px] focus-within:border-yellow-400 transition">
          <FiSearch size={14} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                roleFilter === r.value
                  ? 'bg-yellow-400 text-black border-yellow-400'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-gray-950 text-white">
              <tr>
                {['User', 'Email', 'Phone', 'Role', 'Shop', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-yellow-50/30 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                          {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[140px]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 text-xs">{user.email}</td>
                    <td className="px-5 py-3.5 text-gray-600">{user.phone || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold capitalize ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                        {user.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{user.shop_name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition"
                          title="Edit User"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={toggling === user.id}
                          className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                            user.is_active
                              ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {toggling === user.id ? (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin block" />
                          ) : user.is_active ? (
                            <FiUserX size={13} />
                          ) : (
                            <FiUserCheck size={13} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="Delete User"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 px-5 py-2 bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''} shown</p>
          {roleFilter && <p className="text-xs text-yellow-600 font-semibold">Filtered by: {roleFilter}</p>}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal title={editing ? `Edit User — ${editing.email}` : 'Create New User'} open={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="First Name">
            <input className={inputClass} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          </FormField>
          <FormField label="Last Name">
            <input className={inputClass} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </FormField>
          {!editing && (
            <FormField label="Email Address">
              <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </FormField>
          )}
          {editing && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input className={`${inputClass} opacity-60 cursor-not-allowed`} value={form.email} readOnly title="Email cannot be changed" />
            </div>
          )}
          <FormField label="Phone Number">
            <input className={inputClass} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Role">
            <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
              {ROLES.filter((r) => r.value).map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Assign Shop (optional)">
            <select className={inputClass} value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })}>
              <option value="">-- No Shop --</option>
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.city || 'No city'})</option>
              ))}
            </select>
          </FormField>
          {!editing && (
            <FormField label="Password">
              <input className={inputClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" required />
            </FormField>
          )}
          {editing && (
            <div className="flex items-center gap-3 self-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm font-semibold text-gray-700">{form.is_active ? 'Active' : 'Inactive'}</span>
              </label>
            </div>
          )}
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition flex items-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Saving...' : editing ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AdminUsersPage
