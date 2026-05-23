import React, { useEffect, useState, useRef } from 'react'
import { FiShoppingBag, FiSave, FiMapPin, FiPhone, FiMail, FiFileText, FiCheckCircle, FiClock, FiAlertCircle, FiCamera } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { shopAPI } from '../services/api'

const STATUS_INFO = {
  approved: { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Approved — Your shop is live!' },
  pending: { icon: FiClock, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Pending — Awaiting admin approval.' },
  rejected: { icon: FiAlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Rejected — Please contact admin.' },
  suspended: { icon: FiAlertCircle, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', label: 'Suspended — Contact admin.' },
}

const EMPTY_FORM = {
  name: '', phone: '', email: '', address: '', landmark: '', area: '',
  city: '', state: '', pincode: '', gst_number: '',
}

const ShopSetupPage = () => {
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const logoRef = useRef()

  const fetchShop = async () => {
    setLoading(true)
    try {
      const res = await shopAPI.myShop()
      setShop(res.data)
      setForm({
        name: res.data.name || '',
        phone: res.data.phone || '',
        email: res.data.email || '',
        address: res.data.address || '',
        landmark: res.data.landmark || '',
        area: res.data.area || '',
        city: res.data.city || '',
        state: res.data.state || '',
        pincode: res.data.pincode || '',
        gst_number: res.data.gst_number || '',
      })
      if (res.data.shop_logo) setLogoPreview(res.data.shop_logo)
    } catch (err) {
      if (err.response?.status === 404) {
        setShop(null)
      } else {
        toast.error('Failed to load shop details')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchShop() }, [])

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Shop name is required'); return }
    setSaving(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => formData.append(k, v))
      if (logoFile) formData.append('shop_logo', logoFile)

      if (shop) {
        await shopAPI.updateMyShop(formData)
        toast.success('Shop profile updated!')
      } else {
        await shopAPI.createMyShop(formData)
        toast.success('Shop created! Awaiting admin approval.')
      }
      fetchShop()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Failed to save shop')
    } finally {
      setSaving(false)
    }
  }

  const statusInfo = shop ? STATUS_INFO[shop.status] : null

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Loading shop details...</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
          <FiShoppingBag size={20} className="text-black" />
        </div>
        <div>
          <h1 className="text-gray-900 text-xl font-bold">My Shop Setup</h1>
          <p className="text-gray-500 text-sm">{shop ? 'Update your shop profile' : 'Create your shop to get started'}</p>
        </div>
      </div>

      {/* Status banner */}
      {statusInfo && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${statusInfo.bg}`}>
          <statusInfo.icon size={18} className={statusInfo.color} />
          <p className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        {/* Logo upload */}
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
          <div
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center cursor-pointer hover:border-yellow-400 transition-colors bg-gray-50"
            onClick={() => logoRef.current?.click()}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-gray-400">
                <FiCamera size={22} className="mx-auto mb-1" />
                <p className="text-xs">Logo</p>
              </div>
            )}
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          <div>
            <p className="text-sm font-semibold text-gray-700">Shop Logo</p>
            <p className="text-xs text-gray-400 mt-0.5">Click to upload (JPG, PNG)</p>
            <button type="button" onClick={() => logoRef.current?.click()} className="mt-2 text-xs text-yellow-600 font-semibold hover:underline">
              {logoPreview ? 'Change Logo' : 'Upload Logo'}
            </button>
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Shop Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Bharat Electric Main Branch"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
            <div className="relative">
              <FiPhone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="Mobile number"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <div className="relative">
              <FiMail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="shop@email.com"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">GST Number</label>
            <div className="relative">
              <FiFileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.gst_number}
                onChange={e => setForm(p => ({ ...p, gst_number: e.target.value }))}
                placeholder="22AAAAA0000A1Z5"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Area</label>
            <input
              value={form.area}
              onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
              placeholder="Colony / Area"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
            <div className="relative">
              <FiMapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                placeholder="City"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">State</label>
            <input
              value={form.state}
              onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
              placeholder="State"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Pincode</label>
            <input
              value={form.pincode}
              onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))}
              placeholder="Pincode"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              placeholder="House / Shop No., Street..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 resize-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Landmark</label>
            <input
              value={form.landmark}
              onChange={e => setForm(p => ({ ...p, landmark: e.target.value }))}
              placeholder="Near temple / market..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-yellow-400 text-black rounded-xl font-bold text-sm hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            <FiSave size={15} />
            {saving ? 'Saving...' : shop ? 'Update Shop' : 'Create Shop'}
          </button>
        </div>
      </form>

      {shop && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
          <p>Shop ID: <span className="font-mono text-gray-700">{shop.id}</span></p>
          <p className="mt-0.5">Created: {new Date(shop.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
        </div>
      )}
    </div>
  )
}

export default ShopSetupPage
