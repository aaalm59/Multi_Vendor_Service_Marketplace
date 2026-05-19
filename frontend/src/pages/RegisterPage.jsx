import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { setRefreshToken, setToken, setUser } from '../redux/store'
import { FiMail, FiLock, FiUser, FiPhone, FiZap, FiEye, FiEyeOff } from 'react-icons/fi'

const Field = ({ label, icon: Icon, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />}
      {React.cloneElement(children, { className: `w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm bg-gray-50 transition` })}
    </div>
  </div>
)

const RegisterPage = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirm: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.password_confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const response = await authAPI.register({ ...formData, role: 'customer' })
      const { user, tokens } = response.data
      dispatch(setUser(user))
      dispatch(setToken(tokens.access))
      dispatch(setRefreshToken(tokens.refresh))
      toast.success('Account created successfully!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(
        error.response?.data?.email?.[0] ||
        error.response?.data?.password?.[0] ||
        error.response?.data?.detail ||
        'Registration failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(250,204,21,0.12),_transparent_60%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-yellow-400 p-2 rounded-lg">
              <FiZap size={28} className="text-black" />
            </div>
            <div>
              <h1 className="text-white font-bold text-2xl leading-none">Bharat Electric</h1>
              <p className="text-yellow-400 text-xs font-medium tracking-widest uppercase">Service ERP</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Join the<br />
            <span className="text-yellow-400">Smart Shop</span><br />
            Management
          </h2>
          <p className="text-gray-400 text-base leading-relaxed mb-10">
            Create your account to book electric repair services, track orders, and manage your business efficiently.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '🔧', label: 'Service Booking' },
              { icon: '📄', label: 'Digital Invoices' },
              { icon: '📱', label: 'Job Tracking' },
              { icon: '💳', label: 'Easy Payments' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 bg-gray-900/60 rounded-lg p-3">
                <span className="text-xl">{item.icon}</span>
                <p className="text-white text-sm font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="bg-yellow-400 p-2 rounded-lg">
              <FiZap size={22} className="text-black" />
            </div>
            <h1 className="font-bold text-xl text-gray-900">Bharat Electric ERP</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
              <p className="text-gray-500 mt-1 text-sm">Fill in your details to get started</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" icon={FiUser}>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} placeholder="Arjun" required />
                </Field>
                <Field label="Last Name">
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Kumar" />
                </Field>
              </div>
              <Field label="Email Address" icon={FiMail}>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required />
              </Field>
              <Field label="Phone Number" icon={FiPhone}>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
              </Field>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 8 characters"
                    required
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm bg-gray-50 transition"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="password"
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm bg-gray-50 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <FiZap size={16} />
                    Create Account
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-yellow-500 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
