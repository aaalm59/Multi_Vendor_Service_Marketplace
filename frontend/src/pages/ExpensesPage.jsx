import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiDownload } from 'react-icons/fi'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import ModuleSummary from '../components/ModuleSummary'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { expenseAPI, expenseCategoryAPI } from '../services/api'
import { downloadCSV } from '../utils/exportCSV'

const emptyForm = {
  category: '', description: '', amount: '',
  expense_date: new Date().toISOString().slice(0, 10),
  payment_method: 'cash', notes: '', is_approved: false,
}

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const res = await expenseAPI.getAll({ limit: 100, search, ordering: '-expense_date' })
      setExpenses(res.data.results || res.data || [])
    } catch { toast.error('Expenses load failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadExpenses() }, [search])

  useEffect(() => {
    expenseCategoryAPI.getAll({ limit: 100 })
      .then((r) => setCategories(r.data.results || r.data || []))
      .catch(() => {})
  }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (e) => {
    setEditing(e)
    setForm({
      category: e.category?.id || '', description: e.description || '',
      amount: e.amount || '', expense_date: e.expense_date || new Date().toISOString().slice(0, 10),
      payment_method: e.payment_method || 'cash', notes: e.notes || '',
      is_approved: e.is_approved || false,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, amount: Number(form.amount), category: form.category || null }
      if (editing) { await expenseAPI.update(editing.id, payload); toast.success('Expense updated') }
      else { await expenseAPI.create(payload); toast.success('Expense created') }
      setShowForm(false); loadExpenses()
    } catch (error) { toast.error(error.response?.data?.detail || 'Operation failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (e) => {
    if (!window.confirm(`Delete expense "${e.description}"?`)) return
    try { await expenseAPI.delete(e.id); toast.success('Expense deleted'); loadExpenses() }
    catch { toast.error('Delete failed') }
  }

  const handleExport = () => {
    downloadCSV(expenses, [
      { key: 'expense_number', label: 'Expense #' },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category', getValue: (r) => r.category?.name || '' },
      { key: 'amount', label: 'Amount', getValue: (r) => r.amount || 0 },
      { key: 'expense_date', label: 'Date' },
      { key: 'payment_method', label: 'Payment Method' },
      { key: 'is_approved', label: 'Approved', getValue: (r) => r.is_approved ? 'Yes' : 'No' },
    ], 'expenses')
    toast.success('Expenses CSV downloaded')
  }

  const summary = useMemo(() => {
    const total = expenses.reduce((s, i) => s + Number(i.amount || 0), 0)
    return [
      { label: 'Total Expenses', value: expenses.length },
      { label: 'Total Amount', value: `₹${total.toLocaleString('en-IN')}` },
      { label: 'Pending Approval', value: expenses.filter((i) => !i.is_approved).length },
    ]
  }, [expenses])

  const columns = [
    { key: 'expense_number', label: 'Expense #' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category', render: (r) => r.category?.name || '—' },
    { key: 'amount', label: 'Amount', render: (r) => `₹${Number(r.amount || 0).toLocaleString('en-IN')}` },
    { key: 'expense_date', label: 'Date' },
    { key: 'is_approved', label: 'Status', render: (r) => <StatusBadge value={r.is_approved ? 'approved' : 'pending'} tone={r.is_approved ? 'green' : 'yellow'} /> },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition" title="Edit"><FiEdit2 size={13} /></button>
          <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Delete"><FiTrash2 size={13} /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar title="Expense Management" subtitle="Rent, electricity, salary, transport, maintenance, and shop expenses." search={search} onSearch={setSearch} actionLabel="Add Expense" actionIcon={FiPlus} onAction={openCreate} />
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
          <FiDownload size={14} /> Export CSV
        </button>
      </div>
      <ModuleSummary items={summary} />
      <DataTable columns={columns} rows={expenses} loading={loading} />

      <Modal title={editing ? 'Edit Expense' : 'Add Expense'} open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Amount (₹)">
            <input className={inputClass} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </FormField>
          <FormField label="Expense Date">
            <input className={inputClass} type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
          </FormField>
          <FormField label="Payment Method">
            <select className={inputClass} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea className={inputClass} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Notes">
              <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormField>
          </div>
          <label className="md:col-span-2 flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm({ ...form, is_approved: !form.is_approved })}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.is_approved ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_approved ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm font-semibold text-gray-700">{form.is_approved ? 'Approved' : 'Pending Approval'}</span>
          </label>
          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition">
              {saving ? 'Saving...' : editing ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ExpensesPage
