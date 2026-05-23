import React, { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FiCheck, FiPlus, FiEdit2, FiDownload, FiUserPlus, FiX, FiChevronDown, FiSearch } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import ModuleSummary from '../components/ModuleSummary'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { staffAPI, technicianAPI, userAPI } from '../services/api'
import { downloadCSV } from '../utils/exportCSV'
import { canDo, ROLES } from '../routes/rbac'

const PRESET_DESIGNATIONS = [
  'manager', 'sales_executive', 'inventory_executive', 'accountant',
  'support', 'supervisor', 'team_lead', 'coordinator', 'technician',
]
const PRESET_DEPARTMENTS = [
  'Sales', 'Technical', 'Inventory', 'Support', 'HR', 'Finance', 'Operations', 'Electrical',
]
const STAFF_ROLES = [
  { value: 'manager', label: 'Manager' },
  { value: 'sales_staff', label: 'Sales Staff' },
  { value: 'inventory_staff', label: 'Inventory Staff' },
  { value: 'technician', label: 'Technician' },
]
const roleColors = {
  manager: 'bg-blue-100 text-blue-700',
  sales_staff: 'bg-green-100 text-green-700',
  inventory_staff: 'bg-orange-100 text-orange-700',
  technician: 'bg-purple-100 text-purple-700',
}

const emptyForm = {
  user: '', designation: 'sales_executive', department: 'Sales',
  salary: '', joining_date: new Date().toISOString().slice(0, 10),
  emergency_contact: '', address: '', city: '', state: '', postal_code: '',
}
const emptyNewUser = {
  first_name: '', last_name: '', email: '', phone: '',
  password: '', confirm_password: '', role: 'manager',
}

const calcPwdStrength = (pwd) => {
  if (!pwd) return 0
  let s = 0
  if (pwd.length >= 8) s++
  if (/[A-Z]/.test(pwd)) s++
  if (/[0-9]/.test(pwd)) s++
  if (/[^A-Za-z0-9]/.test(pwd)) s++
  return s
}
const PWD_COLORS = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
const PWD_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']

const StaffPage = () => {
  const [staff, setStaff] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { user } = useSelector((state) => state.auth)
  const canCreate = user?.role === ROLES.ADMIN || user?.role === ROLES.SOP_USER || canDo(user, 'staff', 'create')
  const canEdit   = user?.role === ROLES.ADMIN || user?.role === ROLES.SOP_USER || canDo(user, 'staff', 'update')
  const canManage = user?.role === ROLES.ADMIN || user?.role === ROLES.SOP_USER || canDo(user, 'staff', 'manage_staff')
  const canExportStaff = user?.role === ROLES.ADMIN || user?.role === ROLES.SOP_USER || canDo(user, 'staff', 'export_csv')

  // ── User searchable dropdown ──
  const [userSearch, setUserSearch] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userDropdownRef = useRef(null)

  // ── Inline user creation ──
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUser, setNewUser] = useState(emptyNewUser)
  const [creatingUser, setCreatingUser] = useState(false)
  const [pwdStrength, setPwdStrength] = useState(0)

  // ── Dynamic designation / department ──
  const [useCustomDesignation, setUseCustomDesignation] = useState(false)
  const [useCustomDept, setUseCustomDept] = useState(false)

  const loadStaff = async () => {
    setLoading(true)
    try {
      const res = await staffAPI.getAll({ limit: 100, search })
      setStaff(res.data.results || res.data || [])
    } catch { toast.error('Staff load failed') }
    finally { setLoading(false) }
  }

  const loadUsers = () => {
    userAPI.getAll({ limit: 200, ordering: 'first_name' })
      .then((r) => setUsers(r.data.results || r.data || []))
      .catch(() => {})
  }

  useEffect(() => { loadStaff() }, [search])
  useEffect(() => { loadUsers() }, [])

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Designation list: presets + any custom ones from existing staff
  const allDesignations = useMemo(() => {
    const fromStaff = staff.map(s => s.designation).filter(Boolean)
    return [...new Set([...PRESET_DESIGNATIONS, ...fromStaff])]
  }, [staff])

  // Department list: presets + any custom ones from existing staff
  const allDepartments = useMemo(() => {
    const fromStaff = staff.map(s => s.department).filter(Boolean)
    return [...new Set([...PRESET_DEPARTMENTS, ...fromStaff])]
  }, [staff])

  const selectedUser = users.find(u => String(u.id) === String(form.user)) || null

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim()
    if (!q) return users
    return users.filter(u => {
      const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
      return name.includes(q) || (u.email || '').toLowerCase().includes(q) || (u.phone || '').includes(q)
    })
  }, [users, userSearch])

  // ── Open / close helpers ──
  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowCreateUser(false)
    setNewUser(emptyNewUser)
    setPwdStrength(0)
    setUserSearch('')
    setShowUserDropdown(false)
    setUseCustomDesignation(false)
    setUseCustomDept(false)
    setShowForm(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    const isCustomDes = s.designation && !PRESET_DESIGNATIONS.includes(s.designation)
    const isCustomDpt = s.department && !PRESET_DEPARTMENTS.includes(s.department)
    setUseCustomDesignation(isCustomDes)
    setUseCustomDept(isCustomDpt)
    setShowCreateUser(false)
    setForm({
      user: s.user?.id || '',
      designation: s.designation || 'sales_executive',
      department: s.department || 'Sales',
      salary: s.salary || '',
      joining_date: s.joining_date || new Date().toISOString().slice(0, 10),
      emergency_contact: s.emergency_contact || '',
      address: s.address || '',
      city: s.city || '',
      state: s.state || '',
      postal_code: s.postal_code || '',
    })
    setShowForm(true)
  }

  // ── Submit main form ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!editing && !form.user) { toast.error('Please select or create a user first'); return }
    setSaving(true)
    try {
      const payload = { ...form, salary: Number(form.salary) || 0 }
      if (editing) { await staffAPI.update(editing.id, payload); toast.success('Staff updated') }
      else { await staffAPI.create(payload); toast.success('Staff member added successfully') }
      setShowForm(false)
      loadStaff()
    } catch (error) {
      toast.error(error.response?.data?.user?.[0] || error.response?.data?.detail || 'Operation failed')
    } finally { setSaving(false) }
  }

  // ── Inline user creation ──
  const handleCreateUser = async () => {
    const { first_name, last_name, email, phone, password, confirm_password, role } = newUser
    if (!first_name.trim()) { toast.error('First name is required'); return }
    if (!email.trim()) { toast.error('Email is required'); return }
    if (!password || password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm_password) { toast.error('Passwords do not match'); return }
    setCreatingUser(true)
    try {
      const res = await userAPI.create({
        first_name: first_name.trim(), last_name: last_name.trim(),
        email: email.trim(), phone: phone.trim(), password, role,
      })
      const created = res.data

      // Auto-create technician profile if role is technician
      if (role === 'technician') {
        try {
          await technicianAPI.create({
            user: created.id, specialization: 'General',
            experience_years: 1, hourly_rate: 0, availability_status: 'available',
          })
        } catch { /* best-effort */ }
      }

      // Refresh list and auto-select
      const listRes = await userAPI.getAll({ limit: 200, ordering: 'first_name' })
      const freshList = listRes.data.results || listRes.data || []
      setUsers(freshList)
      setForm(p => ({ ...p, user: String(created.id) }))
      setShowCreateUser(false)
      setNewUser(emptyNewUser)
      setPwdStrength(0)
      toast.success(`"${created.first_name || created.email}" created and selected!`)
    } catch (error) {
      const data = error.response?.data
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | ')
        toast.error(msgs)
      } else {
        toast.error('Failed to create user')
      }
    } finally { setCreatingUser(false) }
  }

  const markPresent = async (item) => {
    try { await staffAPI.markAttendance(item.id, 'present'); toast.success('Attendance marked') }
    catch { toast.error('Attendance mark failed') }
  }

  const handleExport = () => {
    downloadCSV(staff, [
      { key: 'name', label: 'Name', getValue: (r) => `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() },
      { key: 'email', label: 'Email', getValue: (r) => r.user?.email || '' },
      { key: 'designation', label: 'Designation' },
      { key: 'department', label: 'Department' },
      { key: 'salary', label: 'Salary' },
      { key: 'joining_date', label: 'Joining Date' },
      { key: 'city', label: 'City' },
    ], 'staff')
    toast.success('Staff CSV downloaded')
  }

  const summary = useMemo(() => {
    const payroll = staff.reduce((s, i) => s + Number(i.salary || 0), 0)
    return [
      { label: 'Active Staff', value: staff.length },
      { label: 'Monthly Payroll', value: `₹${payroll.toLocaleString('en-IN')}` },
      { label: 'Departments', value: new Set(staff.map(i => i.department).filter(Boolean)).size },
    ]
  }, [staff])

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-semibold">{`${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() || r.user?.email}</span> },
    { key: 'designation', label: 'Designation', render: (r) => <StatusBadge value={r.designation} tone="gray" /> },
    { key: 'department', label: 'Department' },
    { key: 'salary', label: 'Salary', render: (r) => `₹${Number(r.salary || 0).toLocaleString('en-IN')}` },
    { key: 'joining_date', label: 'Joining' },
    { key: 'city', label: 'City' },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5">
          {canEdit && <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition" title="Edit"><FiEdit2 size={13} /></button>}
          {canManage && <button onClick={() => markPresent(r)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition" title="Mark Present"><FiCheck size={13} /></button>}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar
          title="Staff Management"
          subtitle="Attendance, payroll, role responsibility, and internal operations."
          search={search}
          onSearch={setSearch}
          actionLabel={canCreate ? 'Add Staff' : null}
          actionIcon={FiPlus}
          onAction={canCreate ? openCreate : undefined}
        />
        {canExportStaff && (
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            <FiDownload size={14} /> Export CSV
          </button>
        )}
      </div>
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={staff} loading={loading} />

      {/* ── Add / Edit Staff Modal ── */}
      <Modal
        title={editing ? `Edit — ${editing.user?.first_name || 'Staff Member'}` : 'Add New Staff Member'}
        open={showForm}
        onClose={() => setShowForm(false)}
        width="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5" onKeyDown={(e) => { if (e.key === 'Enter' && showCreateUser) e.preventDefault() }}>

          {/* ── USER SELECTION (create mode only) ── */}
          {!editing && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Staff User</p>

              <div className="flex items-start gap-2">
                {/* Searchable dropdown */}
                <div className="flex-1 min-w-0" ref={userDropdownRef}>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowUserDropdown(v => !v); setShowCreateUser(false) }}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm text-left flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-yellow-400 ${showUserDropdown ? 'border-yellow-400 ring-2 ring-yellow-400 bg-white' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                    >
                      {selectedUser ? (
                        <span className="text-gray-800 font-semibold truncate">
                          {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ')}
                          <span className="text-gray-400 font-normal ml-1.5 text-xs">({selectedUser.email})</span>
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-bold capitalize ${roleColors[selectedUser.role] || 'bg-gray-100 text-gray-500'}`}>
                            {selectedUser.role?.replace('_', ' ')}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">Select existing user...</span>
                      )}
                      <FiChevronDown size={14} className={`text-gray-400 flex-shrink-0 ml-2 transition-transform duration-150 ${showUserDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showUserDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                        {/* Search inside dropdown */}
                        <div className="p-2 border-b border-gray-100">
                          <label className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
                            <FiSearch size={13} className="text-gray-400 flex-shrink-0" />
                            <input
                              autoFocus
                              placeholder="Search by name, email or phone..."
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              className="flex-1 text-sm bg-transparent outline-none"
                            />
                            {userSearch && (
                              <button type="button" onClick={() => setUserSearch('')} className="text-gray-400 hover:text-gray-600">
                                <FiX size={12} />
                              </button>
                            )}
                          </label>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredUsers.length === 0 ? (
                            <p className="px-4 py-5 text-sm text-gray-400 text-center">
                              {userSearch ? `No users matching "${userSearch}"` : 'No users available'}
                            </p>
                          ) : (
                            filteredUsers.map(u => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => { setForm(p => ({ ...p, user: String(u.id) })); setShowUserDropdown(false); setUserSearch('') }}
                                className={`w-full text-left px-4 py-2.5 hover:bg-yellow-50 transition border-b border-gray-50 last:border-0 flex items-center gap-2 ${String(form.user) === String(u.id) ? 'bg-yellow-50' : ''}`}
                              >
                                <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-xs flex-shrink-0">
                                  {(u.first_name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800 truncate">
                                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || 'No name'}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                </div>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-bold capitalize flex-shrink-0 ${roleColors[u.role] || 'bg-gray-100 text-gray-500'}`}>
                                  {u.role?.replace('_', ' ')}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Toggle create user */}
                <button
                  type="button"
                  onClick={() => { setShowCreateUser(v => !v); setShowUserDropdown(false); if (!showCreateUser) setForm(p => ({ ...p, user: '' })) }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition whitespace-nowrap flex-shrink-0 ${
                    showCreateUser
                      ? 'bg-gray-100 border-gray-300 text-gray-600'
                      : 'bg-yellow-400 border-yellow-400 text-black hover:bg-yellow-500'
                  }`}
                >
                  {showCreateUser ? <><FiX size={14} /> Cancel</> : <><FiUserPlus size={14} /> New User</>}
                </button>
              </div>

              {/* Empty state hint */}
              {users.length === 0 && !showCreateUser && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No users found. Click <strong>New User</strong> to create one directly.
                </p>
              )}

              {/* ── Inline Create User Panel ── */}
              {showCreateUser && (
                <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <FiUserPlus size={14} className="text-yellow-600" /> Create New Staff User
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Auto-assigned to your current shop.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                      <input className={inputClass} placeholder="First name" value={newUser.first_name} onChange={(e) => setNewUser(p => ({ ...p, first_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                      <input className={inputClass} placeholder="Last name" value={newUser.last_name} onChange={(e) => setNewUser(p => ({ ...p, last_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                      <input className={inputClass} type="email" placeholder="email@example.com" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile Number</label>
                      <input className={inputClass} type="tel" placeholder="+91 00000 00000" value={newUser.phone} onChange={(e) => setNewUser(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Password *</label>
                      <input
                        className={inputClass}
                        type="password"
                        placeholder="Min 8 characters"
                        value={newUser.password}
                        onChange={(e) => { setNewUser(p => ({ ...p, password: e.target.value })); setPwdStrength(calcPwdStrength(e.target.value)) }}
                      />
                      {newUser.password && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex gap-0.5 flex-1">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= pwdStrength ? PWD_COLORS[pwdStrength] : 'bg-gray-200'}`} />
                            ))}
                          </div>
                          <span className={`text-xs font-bold ${pwdStrength <= 1 ? 'text-red-500' : pwdStrength === 2 ? 'text-orange-500' : pwdStrength === 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {PWD_LABELS[pwdStrength]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm Password *</label>
                      <input
                        className={`${inputClass} ${newUser.confirm_password && newUser.confirm_password !== newUser.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                        type="password"
                        placeholder="Repeat password"
                        value={newUser.confirm_password}
                        onChange={(e) => setNewUser(p => ({ ...p, confirm_password: e.target.value }))}
                      />
                      {newUser.confirm_password && newUser.confirm_password !== newUser.password && (
                        <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Role *</label>
                      <select className={inputClass} value={newUser.role} onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value }))}>
                        {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      {newUser.role === 'technician' && (
                        <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
                          A technician profile will also be auto-created for this user.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setShowCreateUser(false); setNewUser(emptyNewUser); setPwdStrength(0) }}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateUser}
                      disabled={creatingUser}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:opacity-60 transition"
                    >
                      {creatingUser
                        ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                        : <><FiCheck size={13} /> Create &amp; Select</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STAFF DETAILS GRID ── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* Designation */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Designation</label>
              {!useCustomDesignation ? (
                <select
                  className={inputClass}
                  value={allDesignations.includes(form.designation) ? form.designation : 'other'}
                  onChange={(e) => {
                    if (e.target.value === 'other') {
                      setUseCustomDesignation(true)
                      setForm(p => ({ ...p, designation: '' }))
                    } else {
                      setForm(p => ({ ...p, designation: e.target.value }))
                    }
                  }}
                >
                  {allDesignations.map(d => (
                    <option key={d} value={d} className="capitalize">{d.replace(/_/g, ' ')}</option>
                  ))}
                  <option value="other">✏ Other (Custom)</option>
                </select>
              ) : (
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    className={inputClass}
                    placeholder="Type custom designation..."
                    value={form.designation}
                    onChange={(e) => setForm(p => ({ ...p, designation: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => { setUseCustomDesignation(false); setForm(p => ({ ...p, designation: 'sales_executive' })) }}
                    className="text-xs text-yellow-600 hover:text-yellow-700 font-semibold"
                  >
                    ← Back to presets
                  </button>
                </div>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Department</label>
              {!useCustomDept ? (
                <select
                  className={inputClass}
                  value={allDepartments.includes(form.department) ? form.department : 'other'}
                  onChange={(e) => {
                    if (e.target.value === 'other') {
                      setUseCustomDept(true)
                      setForm(p => ({ ...p, department: '' }))
                    } else {
                      setForm(p => ({ ...p, department: e.target.value }))
                    }
                  }}
                >
                  {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="other">✏ Other (Custom)</option>
                </select>
              ) : (
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    className={inputClass}
                    placeholder="Type custom department name..."
                    value={form.department}
                    onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => { setUseCustomDept(false); setForm(p => ({ ...p, department: 'Sales' })) }}
                    className="text-xs text-yellow-600 hover:text-yellow-700 font-semibold"
                  >
                    ← Back to presets
                  </button>
                </div>
              )}
            </div>

            <FormField label="Salary (₹)">
              <input
                className={inputClass}
                type="number"
                min="0"
                placeholder="Monthly salary"
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
              />
            </FormField>

            <FormField label="Joining Date">
              <input
                className={inputClass}
                type="date"
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Emergency Contact">
              <input
                className={inputClass}
                placeholder="Phone number"
                value={form.emergency_contact}
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
              />
            </FormField>

            <FormField label="City">
              <input
                className={inputClass}
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </FormField>

            <FormField label="State">
              <input
                className={inputClass}
                placeholder="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </FormField>

            <FormField label="Postal Code">
              <input
                className={inputClass}
                placeholder="PIN code"
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Address">
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder="Full address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </FormField>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={saving || (!editing && !form.user)}
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Saving...' : editing ? 'Update Staff' : 'Save Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default StaffPage
