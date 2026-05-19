import React from 'react'
import { FiSave } from 'react-icons/fi'

const SettingsPage = () => {
  const [settings, setSettings] = React.useState({
    shopName: 'Electric Service Shop',
    email: 'info@electricshop.com',
    phone: '+91-98765-43210',
    address: '123 Main Street',
    gstNumber: '18AABCD1234F1Z0',
    businessHours: '9:00 AM - 6:00 PM',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setSettings((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    // Save settings logic
    alert('Settings saved successfully!')
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Settings</h1>

      {/* Business Settings */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Business Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Shop Name</label>
            <input
              type="text"
              name="shopName"
              value={settings.shopName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Phone</label>
              <input
                type="tel"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Address</label>
            <textarea
              name="address"
              value={settings.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              rows="3"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">GST Number</label>
              <input
                type="text"
                name="gstNumber"
                value={settings.gstNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Business Hours</label>
              <input
                type="text"
                name="businessHours"
                value={settings.businessHours}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="flex items-center space-x-2 bg-green-500 text-white font-bold px-6 py-2 rounded-lg hover:bg-green-600"
      >
        <FiSave /> Save Settings
      </button>
    </div>
  )
}

export default SettingsPage
