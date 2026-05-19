import React, { useEffect, useState } from 'react'
import { FiFileText, FiDownload, FiCalendar, FiDollarSign, FiCreditCard } from 'react-icons/fi'
import { invoiceAPI } from '../../services/api'
import toast from 'react-hot-toast'

const PAYMENT_LABELS = { cash: 'Cash', upi: 'UPI', card: 'Card', cheque: 'Cheque' }
const PAYMENT_COLORS = {
  cash:   'bg-green-100 text-green-700',
  upi:    'bg-blue-100 text-blue-700',
  card:   'bg-purple-100 text-purple-700',
  cheque: 'bg-yellow-100 text-yellow-700',
}

const CustomerInvoicesPage = () => {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    invoiceAPI.getAll({ ordering: '-invoice_date', limit: 100 })
      .then((res) => setInvoices(res.data?.results || res.data || []))
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false))
  }, [])

  const totalSpent = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your billing history and payment records</p>
      </div>

      {/* Summary */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Invoices</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{invoices.length}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
            <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Total Billed</p>
            <p className="text-2xl font-black text-yellow-600 mt-1">₹{totalSpent.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Latest Invoice</p>
            <p className="text-sm font-bold text-gray-900 mt-1 truncate">
              {invoices[0]?.invoice_number || '—'}
            </p>
          </div>
        </div>
      )}

      {/* Invoice List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FiFileText size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-600">No invoices yet</p>
          <p className="text-sm text-gray-400 mt-1">Your invoices will appear here after service completion</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden"
            >
              {/* Row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <FiFileText size={18} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm font-mono">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <FiCalendar size={10} />
                    {new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-black text-gray-900">₹{Number(inv.total_amount || 0).toLocaleString('en-IN')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${PAYMENT_COLORS[inv.payment_method] || 'bg-gray-100 text-gray-600'}`}>
                    {PAYMENT_LABELS[inv.payment_method] || inv.payment_method || '—'}
                  </span>
                </div>
              </div>

              {/* Expanded Detail */}
              {selected?.id === inv.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
                  {/* Line Items */}
                  {inv.items && inv.items.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Items</p>
                      <div className="space-y-1">
                        {inv.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{item.product?.name || 'Item'} × {item.quantity}</span>
                            <span className="font-semibold text-gray-800">₹{Number(item.total || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="border-t border-gray-200 pt-3 space-y-1.5 text-sm">
                    {Number(inv.subtotal) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>₹{Number(inv.subtotal).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {Number(inv.tax_amount) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Tax</span>
                        <span>₹{Number(inv.tax_amount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {Number(inv.discount_amount) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>- ₹{Number(inv.discount_amount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-gray-900 text-base border-t border-gray-200 pt-2 mt-1">
                      <span>Total</span>
                      <span>₹{Number(inv.total_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {inv.notes && (
                    <p className="text-xs text-gray-500 italic">Note: {inv.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CustomerInvoicesPage
