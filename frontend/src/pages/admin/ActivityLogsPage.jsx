import React, { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { FiActivity, FiSearch, FiRefreshCw, FiDownload } from 'react-icons/fi'
import { activityLogAPI } from '../../services/api'
import { downloadCSV } from '../../utils/exportCSV'

const ACTION_COLORS = {
  create:           'bg-emerald-100 text-emerald-700',
  update:           'bg-blue-100 text-blue-700',
  delete:           'bg-red-100 text-red-700',
  login:            'bg-yellow-100 text-yellow-700',
  logout:           'bg-gray-100 text-gray-600',
  export:           'bg-purple-100 text-purple-700',
  assign:           'bg-cyan-100 text-cyan-700',
  status_change:    'bg-orange-100 text-orange-700',
  permission_change:'bg-pink-100 text-pink-700',
  view:             'bg-gray-50 text-gray-500',
}

const ROLE_COLORS = {
  admin:          'bg-red-100 text-red-700',
  manager:        'bg-blue-100 text-blue-700',
  technician:     'bg-purple-100 text-purple-700',
  sales_staff:    'bg-green-100 text-green-700',
  inventory_staff:'bg-orange-100 text-orange-700',
  customer:       'bg-gray-100 text-gray-500',
}

const MODULES = ['', 'auth', 'users', 'bookings', 'billing', 'inventory', 'customers',
                 'staff', 'technicians', 'services', 'reports', 'suppliers', 'expenses']
const ACTIONS = ['', 'create', 'update', 'delete', 'login', 'logout', 'assign',
                 'status_change', 'permission_change', 'export']

const ActivityLogsPage = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, ordering: '-timestamp' }
      if (search) params.search = search
      if (moduleFilter) params.module = moduleFilter
      if (actionFilter) params.action = actionFilter
      const res = await activityLogAPI.getAll(params)
      const data = res.data
      if (data.results !== undefined) {
        setLogs(data.results)
        setTotal(data.count || 0)
      } else {
        setLogs(Array.isArray(data) ? data : [])
        setTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch {
      toast.error('Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }, [search, moduleFilter, actionFilter, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, moduleFilter, actionFilter])

  const handleExport = () => {
    downloadCSV(logs, [
      { key: 'timestamp', label: 'Timestamp', getValue: (r) => new Date(r.timestamp).toLocaleString('en-IN') },
      { key: 'user_name', label: 'User' },
      { key: 'user_role', label: 'Role' },
      { key: 'action', label: 'Action' },
      { key: 'module', label: 'Module' },
      { key: 'description', label: 'Description' },
      { key: 'ip_address', label: 'IP Address' },
    ], 'activity-logs')
    toast.success('Activity logs exported')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 p-1.5 rounded-lg">
            <FiActivity size={18} className="text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
            <p className="text-sm text-gray-500 mt-0.5">Full audit trail — every login, create, update, delete action</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <FiDownload size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-950 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase font-bold">Total Events</p>
          <p className="text-3xl font-bold text-yellow-400 mt-1">{total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-bold">Showing</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{logs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-bold">Page</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{page} / {totalPages || 1}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm flex-1 min-w-[200px] focus-within:border-yellow-400 transition">
          <FiSearch size={14} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, description..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-400 transition"
        >
          {MODULES.map((m) => (
            <option key={m} value={m}>{m || 'All Modules'}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-400 transition"
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a || 'All Actions'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-950 text-white">
              <tr>
                {['Timestamp', 'User', 'Role', 'Action', 'Module', 'Description', 'IP'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    <FiRefreshCw className="inline animate-spin mr-2" size={14} />
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm">{log.user_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      {log.user_role && (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold capitalize ${ROLE_COLORS[log.user_role] || 'bg-gray-100 text-gray-600'}`}>
                          {log.user_role.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold capitalize ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs capitalize font-medium">{log.module}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-xs truncate">{log.description}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ip_address || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} events
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLogsPage
