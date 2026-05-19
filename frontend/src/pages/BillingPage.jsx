import React, { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiMinus, FiPlus, FiPrinter, FiTrash2, FiShoppingCart, FiZap } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { customerAPI, invoiceAPI, productAPI } from '../services/api'
import StatusBadge from '../components/StatusBadge'

const BillingPage = () => {
  const [cartItems, setCartItems] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [searchProduct, setSearchProduct] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [customer, setCustomer] = useState('')
  const [lastInvoice, setLastInvoice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [productResponse, customerResponse, invoiceResponse] = await Promise.all([
          productAPI.getAll({ limit: 200, ordering: 'name' }),
          customerAPI.getAll({ limit: 200, ordering: '-created_at' }),
          invoiceAPI.getAll({ limit: 10, ordering: '-invoice_date' }),
        ])
        setProducts(productResponse.data.results || productResponse.data || [])
        setCustomers(customerResponse.data.results || customerResponse.data || [])
        setInvoices(invoiceResponse.data.results || invoiceResponse.data || [])
      } catch {
        toast.error('POS data load failed')
      } finally {
        setDataLoading(false)
      }
    }
    bootstrap()
  }, [])

  const filteredProducts = useMemo(() => {
    const query = searchProduct.trim().toLowerCase()
    if (!query) return products.slice(0, 12)
    return products.filter((p) =>
      [p.name, p.SKU, p.barcode].filter(Boolean).some((v) => v.toLowerCase().includes(query))
    )
  }, [products, searchProduct])

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.18
  const total = subtotal + tax

  const addItem = (product) => {
    setCartItems((items) => {
      const existing = items.find((item) => item.id === product.id)
      if (existing) return items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      return [...items, { id: product.id, name: product.name, price: Number(product.price), quantity: 1 }]
    })
  }

  const updateQuantity = (id, change) => {
    setCartItems((items) =>
      items.map((item) => item.id === id ? { ...item, quantity: item.quantity + change } : item).filter((item) => item.quantity > 0)
    )
  }

  const removeItem = (id) => setCartItems(cartItems.filter((item) => item.id !== id))

  const handlePay = async () => {
    if (cartItems.length === 0) { toast.error('Cart is empty'); return }
    setLoading(true)
    try {
      const response = await invoiceAPI.create({
        customer: customer || null,
        payment_method: paymentMethod,
        line_items: cartItems.map((item) => ({
          product: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      })
      toast.success('Invoice created successfully!')
      setLastInvoice(response.data)
      setInvoices((items) => [response.data, ...items].slice(0, 10))
      setCartItems([])
      setCustomer('')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invoice creation failed')
    } finally {
      setLoading(false)
    }
  }

  const printReceipt = (invoice = lastInvoice) => {
    if (!invoice) { toast.error('No invoice to print'); return }
    const popup = window.open('', '_blank', 'width=420,height=680')
    popup.document.write(`
      <html>
        <head>
          <title>${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; font-size: 14px; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #FBBF24; padding-bottom: 16px; margin-bottom: 16px; }
            .logo { font-size: 20px; font-weight: bold; }
            .subtitle { color: #555; font-size: 12px; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th { background: #111; color: white; padding: 8px 12px; text-align: left; font-size: 12px; }
            td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
            .totals { border-top: 2px solid #111; padding-top: 8px; }
            .totals p { display: flex; justify-content: space-between; margin: 4px 0; }
            .total-row { font-weight: bold; font-size: 16px; color: #111; }
            .badge { display: inline-block; background: #FEF08A; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .footer { text-align: center; margin-top: 24px; color: #999; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">⚡ Bharat Electric Repairing</div>
            <div class="subtitle">सलेमगढ़, बसडिला गुणगान, रोड</div>
            <div class="subtitle">Mo: +91 8429899565 / 8429292252</div>
          </div>
          <p><strong>Invoice:</strong> ${invoice.invoice_number}</p>
          <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleString('en-IN')}</p>
          <p><strong>Payment:</strong> <span class="badge">${invoice.payment_method?.toUpperCase()}</span></p>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th align="right">Price</th><th align="right">Total</th></tr></thead>
            <tbody>
              ${(invoice.items || []).map((item) => `<tr><td>${item.product?.name || 'Product'}</td><td>${item.quantity}</td><td align="right">₹${item.unit_price}</td><td align="right">₹${item.total}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="totals">
            <p><span>Subtotal:</span><span>₹${invoice.subtotal}</span></p>
            <p><span>GST (18%):</span><span>₹${invoice.tax_amount}</span></p>
            <p class="total-row"><span>Total:</span><span>₹${invoice.total_amount}</span></p>
          </div>
          <div class="footer">Thank you for your business! • आपका धन्यवाद</div>
        </body>
      </html>
    `)
    popup.document.close()
    setTimeout(() => popup.print(), 300)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">POS Billing</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create invoices, manage cart, and accept payments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Products */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 transition">
              <FiSearch className="text-gray-400 flex-shrink-0" size={16} />
              <input
                type="text"
                placeholder="Search by name, SKU, or scan barcode..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
              />
              {searchProduct && (
                <button onClick={() => setSearchProduct('')} className="text-gray-400 hover:text-gray-600 text-xs font-semibold">Clear</button>
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm">
                {searchProduct ? `Search Results (${filteredProducts.length})` : `Products (${products.length} total)`}
              </h3>
            </div>
            {dataLoading ? (
              <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading products...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addItem(product)}
                    className="group relative rounded-xl border border-gray-200 p-3 text-left hover:border-yellow-400 hover:bg-yellow-50 transition"
                  >
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-yellow-400 transition">
                      <FiZap size={14} className="text-yellow-600 group-hover:text-black" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">₹{product.price}</p>
                    {product.inventory?.quantity_on_hand !== undefined && (
                      <p className={`text-xs mt-0.5 font-medium ${product.inventory.is_low_stock ? 'text-red-500' : 'text-gray-400'}`}>
                        Stock: {product.inventory.quantity_on_hand}
                      </p>
                    )}
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="col-span-full py-8 text-center text-sm text-gray-400">No matching products found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-fit">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <FiShoppingCart size={18} className="text-gray-700" />
            <h2 className="font-bold text-gray-900">Cart</h2>
            {cartItems.length > 0 && (
              <span className="ml-auto bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">{cartItems.length}</span>
            )}
          </div>

          {/* Cart Items */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 flex-1">
            {cartItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                <FiShoppingCart size={32} className="mx-auto mb-2 text-gray-200" />
                No items in cart
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                      <FiMinus size={12} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                      <FiPlus size={12} />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="w-6 h-6 rounded bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 ml-1">
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>GST (18%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-2">
              <span>Total</span>
              <span className="text-yellow-500">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer & Payment */}
          <div className="border-t border-gray-100 px-4 py-3 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Customer (Optional)</label>
              <select
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user?.first_name} {c.user?.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Method</label>
              <div className="grid grid-cols-4 gap-1">
                {['cash', 'upi', 'card', 'cheque'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-1.5 rounded-lg text-xs font-bold capitalize transition border ${
                      paymentMethod === m
                        ? 'bg-yellow-400 text-black border-yellow-400'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 space-y-2">
            <button
              onClick={handlePay}
              disabled={cartItems.length === 0 || loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiZap size={16} />
              )}
              {loading ? 'Processing...' : `Pay ₹${total.toFixed(2)}`}
            </button>
            <button
              onClick={() => printReceipt()}
              disabled={!lastInvoice}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              <FiPrinter size={15} />
              Print Last Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Recent Invoices</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">No invoices yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
            {invoices.map((invoice) => (
              <button
                key={invoice.id}
                onClick={() => printReceipt(invoice)}
                className="rounded-xl border border-gray-200 p-3 text-left hover:border-yellow-400 hover:bg-yellow-50 transition group"
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <p className="font-bold text-gray-900 text-xs truncate">{invoice.invoice_number}</p>
                  <StatusBadge value={invoice.payment_method} tone="gray" />
                </div>
                <p className="text-lg font-bold text-gray-900">₹{invoice.total_amount}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</p>
                <p className="text-xs text-yellow-600 mt-1.5 font-semibold opacity-0 group-hover:opacity-100 transition">Click to reprint</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BillingPage
