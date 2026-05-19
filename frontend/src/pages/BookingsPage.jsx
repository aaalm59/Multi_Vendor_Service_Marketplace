import React, { useEffect, useState } from 'react'
import { FiPlus, FiEdit2 } from 'react-icons/fi'
import { bookingAPI } from '../services/api'
import toast from 'react-hot-toast'

const BookingsPage = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await bookingAPI.getAll({ limit: 50 })
      setBookings(response.data.results || [])
    } catch (error) {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Service Bookings</h1>
        <button className="flex items-center space-x-2 bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-500">
          <FiPlus /> New Booking
        </button>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-6 py-3 text-left">Booking #</th>
              <th className="px-6 py-3 text-left">Customer</th>
              <th className="px-6 py-3 text-left">Service</th>
              <th className="px-6 py-3 text-left">Technician</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">{booking.booking_number}</td>
                <td className="px-6 py-3">{booking.customer?.user?.first_name}</td>
                <td className="px-6 py-3">{booking.service?.name}</td>
                <td className="px-6 py-3">{booking.technician?.user?.first_name || 'Unassigned'}</td>
                <td className="px-6 py-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-3">₹{booking.final_amount || booking.quote_amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className="text-center text-gray-500">Loading...</p>}
    </div>
  )
}

export default BookingsPage
