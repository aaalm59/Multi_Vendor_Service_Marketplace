import React from 'react'
import { FiDownload, FiFilter } from 'react-icons/fi'

const ReportsPage = () => {
  const reports = [
    { id: 1, title: 'Revenue Report', type: 'revenue', date: '2024-01-15', records: 125 },
    { id: 2, title: 'Inventory Report', type: 'inventory', date: '2024-01-14', records: 89 },
    { id: 3, title: 'Staff Performance', type: 'performance', date: '2024-01-13', records: 45 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
        <button className="flex items-center space-x-2 bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-500">
          <FiFilter /> Generate Report
        </button>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{report.title}</h3>
            <p className="text-sm text-gray-500 mb-4">Generated: {report.date}</p>
            <div className="flex items-center justify-between">
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-semibold text-gray-700">
                {report.records} records
              </span>
              <button className="flex items-center space-x-1 bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600">
                <FiDownload /> Export
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sample Analytics Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Top Performing Products</h2>
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">Product</th>
              <th className="px-6 py-3 text-left">Units Sold</th>
              <th className="px-6 py-3 text-left">Revenue</th>
              <th className="px-6 py-3 text-left">Profit</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((item) => (
              <tr key={item} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">LED Bulb {item}</td>
                <td className="px-6 py-3">{Math.floor(Math.random() * 500)}</td>
                <td className="px-6 py-3">₹{Math.floor(Math.random() * 50000)}</td>
                <td className="px-6 py-3">₹{Math.floor(Math.random() * 10000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ReportsPage
