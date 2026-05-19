import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiPlus } from 'react-icons/fi'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import ModuleSummary from '../components/ModuleSummary'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { expenseAPI, expenseCategoryAPI } from '../services/api'

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    notes: '',
    is_approved: false,
  })

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const response = await expenseAPI.getAll({ limit: 100, search, ordering: '-expense_date' })
      setExpenses(response.data.results || response.data || [])
    } catch (error) {
      toast.error('Expenses load nahi ho paye')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [search])

  useEffect(() => {
    expenseCategoryAPI.getAll({ limit: 100 })
      .then((response) => setCategories(response.data.results || response.data || []))
      .catch(() => toast.error('Expense categories load nahi hui'))
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await expenseAPI.create({
        ...form,
        amount: Number(form.amount),
        category: form.category || null,
      })
      toast.success('Expense created')
      setShowForm(false)
      setForm({ category: '', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', notes: '', is_approved: false })
      loadExpenses()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Expense create nahi hua')
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => {
    const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return [
      { label: 'Expenses', value: expenses.length },
      { label: 'Total Amount', value: `₹${total.toLocaleString('en-IN')}` },
      { label: 'Pending Approval', value: expenses.filter((item) => !item.is_approved).length },
    ]
  }, [expenses])

  const columns = [
    { key: 'expense_number', label: 'Expense #' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category', render: (row) => row.category?.name || '-' },
    { key: 'amount', label: 'Amount', render: (row) => `₹${Number(row.amount || 0).toLocaleString('en-IN')}` },
    { key: 'expense_date', label: 'Date' },
    { key: 'is_approved', label: 'Approval', render: (row) => <StatusBadge value={row.is_approved ? 'approved' : 'pending'} tone={row.is_approved ? 'green' : 'yellow'} /> },
  ]

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Expense Management"
        subtitle="Rent, electricity, salary, transport, maintenance, and shop expenses."
        search={search}
        onSearch={setSearch}
        actionLabel="Add Expense"
        actionIcon={FiPlus}
        onAction={() => setShowForm(true)}
      />
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={expenses} loading={loading} />

      <Modal title="Add Expense" open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Category">
            <select className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option value="">No category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </FormField>
          <FormField label="Amount">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
          </FormField>
          <FormField label="Expense Date">
            <input className={inputClass} type="date" value={form.expense_date} onChange={(event) => setForm({ ...form, expense_date: event.target.value })} required />
          </FormField>
          <FormField label="Payment Method">
            <select className={inputClass} value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea className={inputClass} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Notes">
              <textarea className={inputClass} rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </FormField>
          </div>
          <label className="md:col-span-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={form.is_approved} onChange={(event) => setForm({ ...form, is_approved: event.target.checked })} />
            Approved
          </label>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ExpensesPage
