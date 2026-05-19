import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setRefreshToken, setUser, setToken } from '../redux/store'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import { FiMail, FiLock, FiZap, FiEye, FiEyeOff } from 'react-icons/fi'

const LoginPage = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await authAPI.login(formData.email, formData.password)
      const { user, tokens } = response.data
      dispatch(setUser(user))
      dispatch(setToken(tokens.access))
      dispatch(setRefreshToken(tokens.refresh))
      toast.success('Login successful!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(250,204,21,0.15),_transparent_60%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-yellow-400 p-2 rounded-lg">
              <FiZap size={28} className="text-black" />
            </div>
            <div>
              <h1 className="text-white font-bold text-2xl leading-none">Bharat Electric</h1>
              <p className="text-yellow-400 text-xs font-medium tracking-widest uppercase">Service ERP</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage Your<br />
            <span className="text-yellow-400">Electric Business</span><br />
            Like a Pro
          </h2>
          <p className="text-gray-400 text-base leading-relaxed">
            Complete ERP for electric repair shops — bookings, inventory, billing, staff & reports in one place.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: '⚡', label: 'Service Bookings', desc: 'Assign & track technicians' },
            { icon: '🏪', label: 'POS & Billing', desc: 'GST invoices, UPI/cash' },
            { icon: '📦', label: 'Inventory', desc: 'Stock alerts, barcode scan' },
            { icon: '📊', label: 'Reports', desc: 'Revenue, profit & loss' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <span className="text-2xl w-8 text-center">{item.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex items-center gap-3 border-t border-gray-800 pt-6">
          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm">B</div>
          <div>
            <p className="text-white text-sm font-semibold">Bharat Electric Repairing</p>
            <p className="text-gray-500 text-xs">सलेमगढ़, बसडिला गुणगान, रोड</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="bg-yellow-400 p-2 rounded-lg">
              <FiZap size={22} className="text-black" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-900 leading-none">Bharat Electric ERP</h1>
              <p className="text-yellow-500 text-xs font-medium tracking-widest uppercase">Service Management</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 mt-1 text-sm">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm bg-gray-50 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm bg-gray-50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <FiZap size={16} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-yellow-500 font-semibold hover:underline">
                  Create one
                </Link>
              </p>
            </div>

            <div className="mt-4 rounded-lg bg-gray-50 p-3 border border-gray-200">
              <p className="text-xs text-gray-500 font-semibold mb-1">Demo Credentials</p>
              <p className="text-xs text-gray-600">Admin: <span className="font-mono">admin@example.com</span> / <span className="font-mono">admin123</span></p>
              <p className="text-xs text-gray-600">Manager: <span className="font-mono">manager@example.com</span> / <span className="font-mono">manager123</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
