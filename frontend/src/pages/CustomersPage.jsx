import React, { useEffect, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi'
import { customerAPI } from '../services/api'
import toast from 'react-hot-toast'

const CustomersPage = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getAll({ limit: 50 })
      setCustomers(response.data.results || [])
    } catch (error) {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter((customer) =>
    customer.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-500"
        >
          <FiPlus /> Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
          <FiSearch className="text-gray-500" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Phone</th>
              <th className="px-6 py-3 text-left">City</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{customer.user?.first_name} {customer.user?.last_name}</td>
                <td className="px-6 py-3">{customer.user?.email}</td>
                <td className="px-6 py-3">{customer.user?.phone}</td>
                <td className="px-6 py-3">{customer.city}</td>
                <td className="px-6 py-3 space-x-3">
                  <button className="text-blue-500 hover:text-blue-700">
                    <FiEdit2 />
                  </button>
                  <button className="text-red-500 hover:text-red-700">
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className="text-center text-gray-500">Loading...</p>}
      {!loading && filteredCustomers.length === 0 && <p className="text-center text-gray-500">No customers found</p>}
    </div>
  )
}

export default CustomersPage
