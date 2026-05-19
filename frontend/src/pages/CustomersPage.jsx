import React, { useEffect, useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { customerAPI } from '../services/api'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import PageToolbar from '../components/PageToolbar'
import { canAccess, roleGroups } from '../routes/rbac'

const CustomersPage = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { user } = useSelector((state) => state.auth)
  const canManageCustomers = canAccess(user, roleGroups.sales)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    shop_name: '',
    gst_number: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    preferred_contact: 'phone',
  })

  useEffect(() => {
    fetchCustomers()
  }, [searchTerm])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const response = await customerAPI.getAll({ limit: 50, search: searchTerm, ordering: '-created_at' })
      setCustomers(response.data.results || response.data || [])
    } catch (error) {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await customerAPI.create(form)
      toast.success('Customer created')
      setShowForm(false)
      setForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        shop_name: '',
        gst_number: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        preferred_contact: 'phone',
      })
      fetchCustomers()
    } catch (error) {
      toast.error(error.response?.data?.email?.[0] || error.response?.data?.detail || 'Customer create nahi hua')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete ${customer.user?.email || 'customer'}?`)) return
    try {
      await customerAPI.delete(customer.id)
      toast.success('Customer deleted')
      fetchCustomers()
    } catch (error) {
      toast.error('Customer delete nahi hua')
    }
  }

  const columns = [
    { key: 'name', label: 'Name', render: (row) => `${row.user?.first_name || ''} ${row.user?.last_name || ''}`.trim() || '-' },
    { key: 'email', label: 'Email', render: (row) => row.user?.email || '-' },
    { key: 'phone', label: 'Phone', render: (row) => row.user?.phone || '-' },
    { key: 'city', label: 'City' },
    { key: 'total_spent', label: 'Spent', render: (row) => `₹${Number(row.total_spent || 0).toLocaleString('en-IN')}` },
    canManageCustomers && {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button onClick={() => handleDelete(row)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
          <FiTrash2 />
        </button>
      ),
    },
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Customers"
        subtitle="Create customers, search records, and manage service/billing profiles."
        search={searchTerm}
        onSearch={setSearchTerm}
        actionLabel={canManageCustomers ? 'Add Customer' : undefined}
        actionIcon={FiPlus}
        onAction={() => setShowForm(true)}
      />

      <DataTable columns={columns} rows={customers} loading={loading} emptyMessage="No customers found" />

      <Modal title="Add Customer" open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            ['first_name', 'First Name'],
            ['last_name', 'Last Name'],
            ['email', 'Email'],
            ['phone', 'Phone'],
            ['shop_name', 'Shop Name'],
            ['gst_number', 'GST Number'],
            ['city', 'City'],
            ['state', 'State'],
            ['postal_code', 'Postal Code'],
          ].map(([name, label]) => (
            <FormField key={name} label={label}>
              <input
                className={inputClass}
                name={name}
                type={name === 'email' ? 'email' : 'text'}
                value={form[name]}
                onChange={(event) => setForm({ ...form, [name]: event.target.value })}
                required={['first_name', 'email', 'city', 'state', 'postal_code'].includes(name)}
              />
            </FormField>
          ))}
          <FormField label="Preferred Contact">
            <select className={inputClass} value={form.preferred_contact} onChange={(event) => setForm({ ...form, preferred_contact: event.target.value })}>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Address">
              <textarea className={inputClass} rows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CustomersPage
