import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FiShield, FiSave, FiUser, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { userAPI, managerPermissionAPI } from '../../services/api'

const MODULES = [
  'customers', 'bookings', 'inventory', 'services',
  'staff', 'billing', 'reports', 'suppliers', 'expenses', 'technicians',
]

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
  { key: 'export_csv', label: 'Export CSV' },
  { key: 'manage_staff', label: 'Manage Staff' },
  { key: 'manage_inventory', label: 'Manage Inventory' },
  { key: 'manage_services', label: 'Manage Services' },
  { key: 'manage_bookings', label: 'Manage Bookings' },
]

const hasPermKey = (set, module, action) => set.has(`${module}:${action}`)

const ManagerRow = ({ manager }) => {
  const [open, setOpen] = useState(false)
  const [perms, setPerms] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await managerPermissionAPI.getPermissions(manager.id)
      setPerms(new Set(res.data.map((p) => `${p.module}:${p.action}`)))
    } catch {
      toast.error('Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const toggle = (module, action) => {
    const key = `${module}:${action}`
    setPerms((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      // If granting any action on a module, also auto-grant view
      if (!next.has(`${module}:view`) && action !== 'view') {
        next.add(`${module}:view`)
      }
      return next
    })
  }

  const toggleModule = (module) => {
    const allKeys = ACTIONS.map((a) => `${module}:${a.key}`)
    const allChecked = allKeys.every((k) => perms.has(k))
    setPerms((prev) => {
      const next = new Set(prev)
      if (allChecked) {
        allKeys.forEach((k) => next.delete(k))
      } else {
        allKeys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const permissions = Array.from(perms).map((key) => {
        const [module, action] = key.split(':')
        return { module, action }
      })
      await managerPermissionAPI.setPermissions(manager.id, permissions)
      toast.success(`Permissions saved for ${manager.first_name}`)
    } catch {
      toast.error('Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  const initials = [manager.first_name?.[0], manager.last_name?.[0]].filter(Boolean).join('') || 'M'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="text-left">
            <p className="text-white font-semibold">
              {manager.first_name} {manager.last_name}
            </p>
            <p className="text-gray-500 text-xs">{manager.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs">
            {perms.size > 0 ? `${perms.size} permissions` : 'No permissions'}
          </span>
          {open ? <FiChevronUp size={16} className="text-gray-400" /> : <FiChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-800 p-4">
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-4">Loading...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-gray-500 text-xs uppercase pb-2 pr-4 font-semibold w-36">Module</th>
                      {ACTIONS.map((a) => (
                        <th key={a.key} className="text-center text-gray-500 text-xs uppercase pb-2 px-1 font-semibold whitespace-nowrap">
                          {a.label}
                        </th>
                      ))}
                      <th className="text-center text-gray-500 text-xs uppercase pb-2 px-2 font-semibold">All</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((mod) => {
                      const allChecked = ACTIONS.every((a) => hasPermKey(perms, mod, a.key))
                      return (
                        <tr key={mod} className="border-t border-gray-800/60">
                          <td className="py-2 pr-4 text-gray-300 capitalize font-medium text-sm">{mod}</td>
                          {ACTIONS.map((a) => (
                            <td key={a.key} className="text-center py-2 px-1">
                              <input
                                type="checkbox"
                                checked={hasPermKey(perms, mod, a.key)}
                                onChange={() => toggle(mod, a.key)}
                                className="w-4 h-4 accent-yellow-400 cursor-pointer"
                              />
                            </td>
                          ))}
                          <td className="text-center py-2 px-2">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              onChange={() => toggleModule(mod)}
                              className="w-4 h-4 accent-yellow-400 cursor-pointer"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <FiSave size={14} />
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const ManagerPermissionsPage = () => {
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    userAPI.getByRole('manager')
      .then((res) => setManagers(res.data?.results || res.data || []))
      .catch(() => toast.error('Failed to load managers'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
          <FiShield size={20} className="text-black" />
        </div>
        <div>
          <h1 className="text-white text-xl font-bold">Manager Permissions</h1>
          <p className="text-gray-400 text-sm">Assign module-level access to each manager</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading managers...</div>
      ) : managers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FiUser size={40} className="mx-auto mb-3 opacity-30" />
          <p>No manager accounts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {managers.map((m) => (
            <ManagerRow key={m.id} manager={m} />
          ))}
        </div>
      )}
    </div>
  )
}

export default ManagerPermissionsPage
