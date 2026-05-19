import React, { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { reportAPI } from '../services/api'

const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await reportAPI.getDailyMetrics({ limit: 30 })
      setMetrics(response.data)
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    { title: 'Total Revenue', value: '₹45,000', color: 'bg-green-100', icon: '💰' },
    { title: 'Total Bookings', value: '128', color: 'bg-blue-100', icon: '📅' },
    { title: 'Completed Today', value: '12', color: 'bg-purple-100', icon: '✓' },
    { title: 'Pending Tasks', value: '5', color: 'bg-yellow-100', icon: '⏳' },
  ]

  const dummyData = [
    { date: 'Jan 1', revenue: 4000, expenses: 2400 },
    { date: 'Jan 2', revenue: 3000, expenses: 1398 },
    { date: 'Jan 3', revenue: 2000, expenses: 9800 },
    { date: 'Jan 4', revenue: 2780, expenses: 3908 },
    { date: 'Jan 5', revenue: 1890, expenses: 4800 },
  ]

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <div key={index} className={`${card.color} p-6 rounded-lg shadow-md`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">{card.title}</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">{card.value}</p>
              </div>
              <span className="text-4xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Revenue vs Expenses</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dummyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#FFD700" name="Revenue" />
              <Bar dataKey="expenses" fill="#000000" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dummyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#FFD700" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center justify-between p-3 border-b hover:bg-gray-50">
              <div>
                <p className="font-semibold text-gray-800">Booking #{item}001</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
              <span className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                In Progress
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
