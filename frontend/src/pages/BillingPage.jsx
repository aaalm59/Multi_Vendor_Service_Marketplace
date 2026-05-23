import React, { useEffect, useMemo, useState } from 'react'
import {
  FiSearch, FiMinus, FiPlus, FiPrinter, FiTrash2,
  FiShoppingCart, FiZap, FiX, FiAlertTriangle,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { categoryAPI, customerAPI, invoiceAPI, productAPI, shopAPI } from '../services/api'

const PAYMENT_METHODS = [
  { key: 'cash',   label: 'CASH',   icon: '💵' },
  { key: 'upi',    label: 'UPI',    icon: '📱' },
  { key: 'card',   label: 'CARD',   icon: '💳' },
  { key: 'cheque', label: 'CHEQUE', icon: '🧾' },
  { key: 'wallet', label: 'WALLET', icon: '👛' },
]

const BillingPage = () => {
  const { user } = useSelector((state) => state.auth)
  const isAdmin = user?.role === 'admin'

  const [cartItems, setCartItems]       = useState([])
  const [products, setProducts]         = useState([])
  const [categories, setCategories]     = useState([])
  const [customers, setCustomers]       = useState([])
  const [invoices, setInvoices]         = useState([])
  const [shops, setShops]               = useState([])
  const [analytics, setAnalytics]       = useState([])
  const [dailySummary, setDailySummary] = useState(null)

  const [searchProduct, setSearchProduct]   = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedShop, setSelectedShop]     = useState('')
  const [paymentMethod, setPaymentMethod]   = useState('cash')
  const [customer, setCustomer]             = useState('')
  const [discount, setDiscount]             = useState('')
  const [notes, setNotes]                   = useState('')
  const [lastInvoice, setLastInvoice]       = useState(null)
  const [loading, setLoading]               = useState(false)
  const [dataLoading, setDataLoading]       = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [productRes, customerRes, invoiceRes, categoryRes] = await Promise.all([
          productAPI.getAll({ limit: 300, ordering: 'name' }),
          customerAPI.getAll({ limit: 200, ordering: '-created_at' }),
          invoiceAPI.getAll({ limit: 12, ordering: '-invoice_date' }),
          categoryAPI.getAll(),
        ])
        setProducts(productRes.data.results || productRes.data || [])
        setCustomers(customerRes.data.results || customerRes.data || [])
        setInvoices(invoiceRes.data.results || invoiceRes.data || [])
        setCategories(categoryRes.data.results || categoryRes.data || [])
      } catch { toast.error('POS data load failed') }
      finally { setDataLoading(false) }
    }

    invoiceAPI.getDailySummary()
      .then((r) => setDailySummary(r.data))
      .catch(() => {})

    if (isAdmin) {
      shopAPI.getAll({ limit: 100 })
        .then((r) => setShops(r.data.results || r.data || []))
        .catch(() => {})
      invoiceAPI.getBillingAnalytics()
        .then((r) => setAnalytics(r.data || []))
        .catch(() => {})
    }

    bootstrap()
  }, [isAdmin])

  // Reload products when admin switches shop filter
  useEffect(() => {
    if (!isAdmin) return
    const params = { limit: 300, ordering: 'name' }
    if (selectedShop) params.shop = selectedShop
    productAPI.getAll(params)
      .then((r) => setProducts(r.data.results || r.data || []))
      .catch(() => {})
  }, [selectedShop, isAdmin])

  const filteredProducts = useMemo(() => {
    let list = products
    if (selectedCategory) list = list.filter((p) => p.category?.id === selectedCategory)
    const q = searchProduct.trim().toLowerCase()
    if (!q) return list.slice(0, 16)
    return list.filter((p) =>
      [p.name, p.SKU, p.barcode].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    )
  }, [products, searchProduct, selectedCategory])

  // ── Cart Calculations ──────────────────────────────────────────────────────
  const cartSubtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const cartGst      = cartItems.reduce((s, i) => s + i.price * i.quantity * (i.tax_rate / 100), 0)
  const discountAmt  = Math.min(parseFloat(discount) || 0, cartSubtotal + cartGst)
  const cartTotal    = Math.max(0, cartSubtotal + cartGst - discountAmt)

  // ── Cart Actions ───────────────────────────────────────────────────────────
  const addItem = (product) => {
    const stock = product.inventory?.quantity_on_hand ?? Infinity
    setCartItems((items) => {
      const existing = items.find((i) => i.id === product.id)
      if (existing) {
        if (existing.quantity >= stock) {
          toast.error(`Only ${stock} in stock`)
          return items
        }
        return items.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...items,
        {
          id: product.id,
          name: product.name,
          sku: product.SKU,
          price: Number(product.price),
          tax_rate: Number(product.tax_rate ?? 18),
          quantity: 1,
          stock,
          is_low_stock: product.inventory?.is_low_stock,
        },
      ]
    })
  }

  const updateQuantity = (id, delta) => {
    setCartItems((items) => {
      return items
        .map((i) => {
          if (i.id !== id) return i
          const next = i.quantity + delta
          if (next > i.stock) { toast.error(`Only ${i.stock} in stock`); return i }
          return { ...i, quantity: next }
        })
        .filter((i) => i.quantity > 0)
    })
  }

  const removeItem = (id) => setCartItems((i) => i.filter((x) => x.id !== id))
  const clearCart  = () => { setCartItems([]); setDiscount(''); setCustomer(''); setNotes('') }

  // ── Pay ───────────────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (cartItems.length === 0) { toast.error('Cart is empty'); return }
    setLoading(true)
    try {
      const payload = {
        customer: customer || null,
        payment_method: paymentMethod,
        discount_amount: discountAmt.toFixed(2),
        notes,
        line_items: cartItems.map((i) => ({
          product: i.id,
          quantity: i.quantity,
          unit_price: i.price,
          tax_rate: i.tax_rate,
        })),
      }
      const res = await invoiceAPI.create(payload)
      toast.success(`Invoice ${res.data.invoice_number} created!`)
      setLastInvoice(res.data)
      setInvoices((prev) => [res.data, ...prev].slice(0, 12))
      clearCart()
      invoiceAPI.getDailySummary().then((r) => setDailySummary(r.data)).catch(() => {})
      if (isAdmin) invoiceAPI.getBillingAnalytics().then((r) => setAnalytics(r.data || [])).catch(() => {})
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.line_items || 'Invoice creation failed')
    } finally { setLoading(false) }
  }

  // ── Print Receipt ─────────────────────────────────────────────────────────
  const printReceipt = (invoice = lastInvoice) => {
    if (!invoice) { toast.error('No invoice to print'); return }
    const shopName  = invoice.shop_name || 'Bharat Electric Repairing'
    const shopGst   = invoice.shop_gst  || ''
    const shopPhone = invoice.shop_phone || '+91 8429899565'
    const popup = window.open('', '_blank', 'width=420,height=700')
    popup.document.write(`
      <html>
        <head>
          <title>${invoice.invoice_number}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 13px; color: #111; margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #FBBF24; padding-bottom: 14px; margin-bottom: 14px; }
            .logo { font-size: 18px; font-weight: bold; }
            .sub { color: #555; font-size: 11px; margin-top: 3px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th { background: #111; color: white; padding: 7px 10px; text-align: left; font-size: 11px; }
            td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
            .totals { border-top: 2px solid #111; padding-top: 8px; margin-top: 4px; }
            .totals p { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
            .total-row { font-weight: bold; font-size: 16px; }
            .badge { display: inline-block; background: #FEF08A; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #999; font-size: 11px; border-top: 1px dashed #ddd; padding-top: 12px; }
            .discount { color: #16a34a; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">⚡ ${shopName}</div>
            ${shopGst ? `<div class="sub">GST: ${shopGst}</div>` : ''}
            <div class="sub">📞 ${shopPhone}</div>
          </div>
          <div class="info">
            <div>
              <strong>Invoice:</strong> ${invoice.invoice_number}<br/>
              <strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleString('en-IN')}<br/>
              <strong>Payment:</strong> <span class="badge">${(invoice.payment_method || '').toUpperCase()}</span>
            </div>
            <div style="text-align:right">
              <strong>Customer:</strong><br/>${invoice.customer_name || 'Walk-in Customer'}
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Rate</th><th>GST%</th><th align="right">Total</th></tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map((item) => `
                <tr>
                  <td>${item.product?.name || 'Product'}</td>
                  <td>${item.quantity}</td>
                  <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td>${item.tax_rate}%</td>
                  <td align="right">₹${parseFloat(item.total).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <p><span>Subtotal:</span><span>₹${parseFloat(invoice.subtotal || 0).toFixed(2)}</span></p>
            <p><span>GST:</span><span>₹${parseFloat(invoice.tax_amount || 0).toFixed(2)}</span></p>
            ${parseFloat(invoice.discount_amount || 0) > 0
              ? `<p class="discount"><span>Discount:</span><span>-₹${parseFloat(invoice.discount_amount).toFixed(2)}</span></p>`
              : ''}
            <p class="total-row"><span>Total:</span><span>₹${parseFloat(invoice.total_amount || 0).toFixed(2)}</span></p>
          </div>
          ${invoice.notes ? `<p style="font-size:11px;color:#555;margin-top:8px">Note: ${invoice.notes}</p>` : ''}
          <div class="footer">Thank you for your business!<br/>आपका धन्यवाद 🙏</div>
        </body>
      </html>
    `)
    popup.document.close()
    setTimeout(() => popup.print(), 300)
  }

  const filteredInvoices = useMemo(() => {
    if (!isAdmin || !selectedShop) return invoices
    return invoices.filter((inv) => inv.shop === selectedShop)
  }, [invoices, selectedShop, isAdmin])

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">POS Billing</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAdmin ? 'Shop-wise billing — all shops overview' : 'Create invoices, manage cart, and accept payments'}
        </p>
      </div>

      {/* Stats Cards */}
      {dailySummary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {[
            { label: "Today's Bills", value: dailySummary.today_invoices, icon: '🧾', color: 'text-indigo-700' },
            { label: "Today's Revenue", value: `₹${dailySummary.today_revenue.toLocaleString()}`, icon: '💰', color: 'text-green-700' },
            { label: 'Avg Bill', value: `₹${Math.round(dailySummary.today_avg).toLocaleString()}`, icon: '📊', color: 'text-blue-700' },
            { label: 'Total Invoices', value: dailySummary.total_invoices, icon: '📋', color: 'text-gray-700' },
            { label: 'Total Revenue', value: `₹${Math.round(dailySummary.total_revenue).toLocaleString()}`, icon: '🏦', color: 'text-yellow-700' },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 shadow-sm">
              <span className="text-xl">{c.icon}</span>
              <div>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-base font-bold ${c.color}`}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin: Shop Analytics Cards */}
      {isAdmin && analytics.length > 0 && (
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">Shop-wise Revenue — click to filter</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {analytics.map((a) => {
              const active = selectedShop === a.shop_id
              return (
                <div
                  key={a.shop_id}
                  onClick={() => setSelectedShop(active ? '' : a.shop_id)}
                  className={`flex-shrink-0 cursor-pointer rounded-xl border p-4 min-w-[190px] transition-all select-none
                    ${active
                      ? 'border-indigo-400 bg-indigo-50 shadow-md ring-1 ring-indigo-300'
                      : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm'
                    }`}
                >
                  <p className="text-xs font-bold text-indigo-800 truncate mb-0.5">{a.shop_name}</p>
                  <p className="text-xs text-gray-400 truncate mb-2">{a.shop_owner || 'No owner'}</p>
                  <div className="grid grid-cols-2 gap-1.5 text-center">
                    <div className="bg-white rounded-lg p-1.5 border border-gray-100">
                      <p className="text-sm font-bold text-gray-900">₹{Math.round(a.today_revenue).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Today</p>
                    </div>
                    <div className="bg-white rounded-lg p-1.5 border border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{a.today_invoices}</p>
                      <p className="text-xs text-gray-400">Bills</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                    Total: ₹{Math.round(a.total_revenue).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* POS Main Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Products ── */}
        <div className="lg:col-span-2 space-y-3">

          {/* Search + Shop Filter */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-2">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 transition">
              <FiSearch className="text-gray-400 flex-shrink-0" size={16} />
              <input
                type="text"
                placeholder="Search by name, SKU, or scan barcode..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                autoFocus
              />
              {searchProduct && (
                <button onClick={() => setSearchProduct('')} className="text-gray-400 hover:text-gray-600">
                  <FiX size={14} />
                </button>
              )}
            </div>

            {/* Filters row */}
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {isAdmin && (
                <select
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                  className="flex-shrink-0 rounded-lg border border-gray-200 text-xs px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">All Shops</option>
                  {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <button
                onClick={() => setSelectedCategory('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition
                  ${!selectedCategory ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'}`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(selectedCategory === c.id ? '' : c.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition
                    ${selectedCategory === c.id ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm">
                {searchProduct
                  ? `Results (${filteredProducts.length})`
                  : `Products (${products.length} total)`}
              </h3>
            </div>
            {dataLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredProducts.map((product) => {
                  const stock = product.inventory?.quantity_on_hand ?? '—'
                  const isLow = product.inventory?.is_low_stock
                  const outOfStock = typeof stock === 'number' && stock === 0
                  return (
                    <button
                      key={product.id}
                      onClick={() => !outOfStock && addItem(product)}
                      disabled={outOfStock}
                      className={`group relative rounded-xl border p-3 text-left transition
                        ${outOfStock
                          ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                          : isLow
                            ? 'border-orange-200 hover:border-orange-400 hover:bg-orange-50'
                            : 'border-gray-200 hover:border-yellow-400 hover:bg-yellow-50'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition
                        ${outOfStock ? 'bg-gray-100' : isLow ? 'bg-orange-100 group-hover:bg-orange-400' : 'bg-yellow-100 group-hover:bg-yellow-400'}`}
                      >
                        <FiZap size={14} className={`${outOfStock ? 'text-gray-300' : isLow ? 'text-orange-500 group-hover:text-white' : 'text-yellow-600 group-hover:text-black'}`} />
                      </div>
                      {product.category?.name && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full leading-none mb-1 inline-block">
                          {product.category.name}
                        </span>
                      )}
                      <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{product.name}</p>
                      <p className="text-xs font-bold text-gray-700 mt-0.5">₹{product.price}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-xs font-medium ${isLow ? 'text-orange-500' : outOfStock ? 'text-red-500' : 'text-gray-400'}`}>
                          {outOfStock ? '❌ Out' : isLow ? `⚠ ${stock}` : `Stock: ${stock}`}
                        </p>
                        <span className="text-xs text-gray-300">{product.tax_rate}%</span>
                      </div>
                    </button>
                  )
                })}
                {filteredProducts.length === 0 && !dataLoading && (
                  <p className="col-span-full py-10 text-center text-sm text-gray-400">No matching products found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          {/* Cart Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <FiShoppingCart size={18} className="text-gray-700" />
            <h2 className="font-bold text-gray-900">Cart</h2>
            {cartItems.length > 0 && (
              <span className="ml-auto bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {cartItems.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
            {cartItems.length > 0 && (
              <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-500 ml-1">Clear</button>
            )}
          </div>

          {/* Cart Items */}
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {cartItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                <FiShoppingCart size={32} className="mx-auto mb-2 text-gray-200" />
                No items in cart
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">₹{item.price} · {item.tax_rate}% GST</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <FiMinus size={11} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <FiPlus size={11} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-6 h-6 rounded bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 ml-0.5"
                    >
                      <FiTrash2 size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>₹{cartSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>GST</span>
              <span>₹{cartGst.toFixed(2)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-xs text-green-600 font-medium">
                <span>Discount</span>
                <span>-₹{discountAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
              <span>Total</span>
              <span className="text-yellow-600">₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Discount */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Discount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 bg-gray-50"
            />
          </div>

          {/* Customer */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Customer</label>
            <select
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 bg-gray-50"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.user?.first_name} {c.user?.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Methods */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-5 gap-1">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setPaymentMethod(m.key)}
                  className={`flex flex-col items-center py-1.5 rounded-lg text-xs font-bold transition border
                    ${paymentMethod === m.key
                      ? 'bg-yellow-400 text-black border-yellow-400'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300'
                    }`}
                >
                  <span className="text-base leading-none mb-0.5">{m.icon}</span>
                  <span className="text-xs leading-none">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (optional)</label>
            <input
              type="text"
              placeholder="Add a note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400 bg-gray-50"
            />
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 pt-2 space-y-2">
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
              {loading ? 'Processing...' : `Pay ₹${cartTotal.toFixed(2)}`}
            </button>
            <button
              onClick={() => printReceipt()}
              disabled={!lastInvoice}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              <FiPrinter size={15} />
              Print Last Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Recent Invoices</h2>
          <span className="text-xs text-gray-400">{filteredInvoices.length} shown</span>
        </div>
        {filteredInvoices.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">No invoices yet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
            {filteredInvoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => printReceipt(inv)}
                className="rounded-xl border border-gray-200 p-3 text-left hover:border-yellow-400 hover:bg-yellow-50 transition group"
              >
                <p className="font-bold text-gray-900 text-xs truncate">{inv.invoice_number}</p>
                {isAdmin && inv.shop_name && (
                  <p className="text-xs text-indigo-600 truncate mt-0.5">🏪 {inv.shop_name}</p>
                )}
                <p className="text-sm font-bold text-gray-800 mt-1">₹{parseFloat(inv.total_amount).toLocaleString()}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800`}>
                    {(inv.payment_method || '').toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(inv.invoice_date).toLocaleDateString('en-IN')}
                </p>
                <p className="text-xs text-yellow-600 mt-1 font-semibold opacity-0 group-hover:opacity-100 transition">
                  🖨 Reprint
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BillingPage
