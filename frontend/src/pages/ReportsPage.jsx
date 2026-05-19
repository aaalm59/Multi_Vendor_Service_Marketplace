import React, { useEffect, useState } from 'react'
import { FiDownload, FiTrendingUp, FiDollarSign, FiPackage, FiCalendar, FiBarChart2, FiRefreshCw } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import toast from 'react-hot-toast'
import { reportAPI } from '../services/api'
import apiClient from '../services/apiClient'

const MetricCard = ({ label, value, sub, tone = 'default' }) => {
  const tones = {
    default: 'bg-white border-gray-200',
    green: 'bg-emerald-50 border-emerald-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-sky-50 border-sky-200',
  }
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.default}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

const ReportsPage = () => {
  const [metrics, setMetrics] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [metricsRes, reportsRes] = await Promise.allSettled([
        reportAPI.getDailyMetrics({ limit: 30, ordering: '-date' }),
        reportAPI.getAll({ limit: 20 }),
      ])
      if (metricsRes.status === 'fulfilled') {
        setMetrics((metricsRes.value.data.results || metricsRes.value.data || []).reverse())
      }
      if (reportsRes.status === 'fulfilled') {
        setReports(reportsRes.value.data.results || reportsRes.value.data || [])
      }
    } catch {
      toast.error('Reports load failed')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    setExportLoading(format)
    try {
      const params = { format }
      if (dateRange.start) params.start_date = dateRange.start
      if (dateRange.end) params.end_date = dateRange.end

      const response = await apiClient.get('/reports/reports/export/', {
        params,
        responseType: 'blob',
      })

      const mimeTypes = {
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
      }
      const extensions = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeTypes[format] }))
      const link = document.createElement('a')
      link.href = url
      link.download = `electric-erp-report-${new Date().toISOString().slice(0, 10)}.${extensions[format]}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success(`${format.toUpperCase()} export downloaded`)
    } catch {
      toast.error(`Export failed — backend may not support ${format} yet`)
    } finally {
      setExportLoading('')
    }
  }

  const totals = metrics.reduce(
    (acc, m) => ({
      revenue: acc.revenue + Number(m.total_revenue || 0),
      expenses: acc.expenses + Number(m.total_expenses || 0),
      profit: acc.profit + Number(m.total_profit || 0),
      bookings: acc.bookings + Number(m.total_bookings || 0),
    }),
    { revenue: 0, expenses: 0, profit: 0, bookings: 0 }
  )

  const chartData = metrics.slice(-14).map((m) => ({
    date: m.date?.slice(5),
    Revenue: Number(m.total_revenue || 0),
    Expenses: Number(m.total_expenses || 0),
    Profit: Number(m.total_profit || 0),
  }))

  const reportTypeLabels = {
    revenue: { label: 'Revenue Report', icon: FiDollarSign, color: 'bg-yellow-400 text-black' },
    profit_loss: { label: 'Profit & Loss', icon: FiTrendingUp, color: 'bg-emerald-500 text-white' },
    inventory: { label: 'Inventory Report', icon: FiPackage, color: 'bg-sky-500 text-white' },
    booking: { label: 'Booking Report', icon: FiCalendar, color: 'bg-purple-500 text-white' },
    expense: { label: 'Expense Report', icon: FiBarChart2, color: 'bg-rose-500 text-white' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue, profit/loss, inventory, and service analytics</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Revenue" value={`₹${totals.revenue.toLocaleString('en-IN')}`} sub="All time" tone="yellow" />
        <MetricCard label="Total Expenses" value={`₹${totals.expenses.toLocaleString('en-IN')}`} sub="All time" tone="red" />
        <MetricCard label="Net Profit" value={`₹${totals.profit.toLocaleString('en-IN')}`} sub="Revenue - Expenses" tone={totals.profit >= 0 ? 'green' : 'red'} />
        <MetricCard label="Total Bookings" value={totals.bookings} sub="Service jobs logged" tone="blue" />
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-4">Export Reports</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { format: 'csv', label: 'CSV', color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
              { format: 'excel', label: 'Excel', color: 'bg-sky-500 text-white hover:bg-sky-600' },
              { format: 'pdf', label: 'PDF', color: 'bg-rose-500 text-white hover:bg-rose-600' },
            ].map(({ format, label, color }) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                disabled={!!exportLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition disabled:opacity-60 ${color}`}
              >
                {exportLoading === format ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiDownload size={14} />
                )}
                {exportLoading === format ? 'Exporting...' : `Export ${label}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Revenue vs Expenses (Last 14 Days)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Legend />
                <Bar dataKey="Revenue" fill="#FBBF24" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill="#111827" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Profit Trend</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Line type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Revenue" stroke="#FBBF24" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily Metrics Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Daily Metrics</h2>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading metrics...</div>
        ) : metrics.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No metrics yet — data appears after transactions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-950 text-white">
                <tr>
                  {['Date', 'Revenue', 'Expenses', 'Profit', 'Bookings'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...metrics].reverse().slice(0, 30).map((metric) => {
                  const profit = Number(metric.total_profit || 0)
                  return (
                    <tr key={metric.date} className="hover:bg-yellow-50/40 transition">
                      <td className="px-5 py-3 font-semibold text-gray-900">{metric.date}</td>
                      <td className="px-5 py-3 text-gray-700">₹{Number(metric.total_revenue || 0).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3 text-gray-700">₹{Number(metric.total_expenses || 0).toLocaleString('en-IN')}</td>
                      <td className={`px-5 py-3 font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {profit >= 0 ? '+' : ''}₹{Math.abs(profit).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{metric.total_bookings || 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generated Reports */}
      {reports.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Generated Reports</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {reports.map((report) => {
              const meta = reportTypeLabels[report.report_type] || { label: report.report_type, icon: FiBarChart2, color: 'bg-gray-900 text-white' }
              const Icon = meta.icon
              return (
                <div key={report.id} className="rounded-xl border border-gray-200 p-4 hover:border-yellow-300 hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${meta.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{report.title || meta.label}</p>
                      <p className="text-xs text-gray-400">{report.report_type}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {report.start_date && <p>From: {report.start_date}</p>}
                    {report.end_date && <p>To: {report.end_date}</p>}
                    <p>Generated: {new Date(report.generated_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <button
                    onClick={() => handleExport('csv')}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-yellow-600 hover:underline"
                  >
                    <FiDownload size={12} /> Download
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportsPage
