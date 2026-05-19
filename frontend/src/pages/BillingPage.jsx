import React, { useEffect, useMemo, useState } from 'react'
import { FiHash, FiMinus, FiPlus, FiPrinter, FiTrash2 } from 'react-icons/fi'
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

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [productResponse, customerResponse, invoiceResponse] = await Promise.all([
          productAPI.getAll({ limit: 100, ordering: 'name' }),
          customerAPI.getAll({ limit: 100, ordering: '-created_at' }),
          invoiceAPI.getAll({ limit: 8, ordering: '-invoice_date' }),
        ])
        setProducts(productResponse.data.results || productResponse.data || [])
        setCustomers(customerResponse.data.results || customerResponse.data || [])
        setInvoices(invoiceResponse.data.results || invoiceResponse.data || [])
      } catch (error) {
        toast.error('POS data load nahi ho paya')
      }
    }
    bootstrap()
  }, [])

  const filteredProducts = useMemo(() => {
    const query = searchProduct.trim().toLowerCase()
    if (!query) return products.slice(0, 8)
    return products.filter((product) =>
      [product.name, product.SKU, product.barcode]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [products, searchProduct])

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.18
  const total = subtotal + tax

  const addItem = (product) => {
    setCartItems((items) => {
      const existing = items.find((item) => item.id === product.id)
      if (existing) {
        return items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...items, { id: product.id, name: product.name, price: Number(product.price), quantity: 1 }]
    })
  }

  const updateQuantity = (id, change) => {
    setCartItems((items) =>
      items
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + change } : item))
        .filter((item) => item.quantity > 0)
    )
  }

  const removeItem = (id) => {
    setCartItems(cartItems.filter((item) => item.id !== id))
  }

  const handlePay = async () => {
    if (cartItems.length === 0) return
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
      toast.success('Invoice created')
      setLastInvoice(response.data)
      setInvoices((items) => [response.data, ...items].slice(0, 8))
      setCartItems([])
      setCustomer('')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invoice create nahi hua')
    } finally {
      setLoading(false)
    }
  }

  const printReceipt = (invoice = lastInvoice) => {
    if (!invoice) {
      toast.error('Print ke liye invoice nahi mila')
      return
    }
    const receipt = `
      <html>
        <head><title>${invoice.invoice_number}</title></head>
        <body style="font-family: Arial; padding: 24px;">
          <h2>Electric Service ERP</h2>
          <p><strong>Invoice:</strong> ${invoice.invoice_number}</p>
          <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleString()}</p>
          <hr />
          <table style="width:100%; border-collapse: collapse;">
            <thead><tr><th align="left">Item</th><th>Qty</th><th align="right">Total</th></tr></thead>
            <tbody>
              ${(invoice.items || []).map((item) => `<tr><td>${item.product?.name || 'Product'}</td><td align="center">${item.quantity}</td><td align="right">Rs ${item.total}</td></tr>`).join('')}
            </tbody>
          </table>
          <hr />
          <p align="right"><strong>Subtotal:</strong> Rs ${invoice.subtotal}</p>
          <p align="right"><strong>GST:</strong> Rs ${invoice.tax_amount}</p>
          <h3 align="right">Total: Rs ${invoice.total_amount}</h3>
        </body>
      </html>
    `
    const popup = window.open('', '_blank', 'width=420,height=640')
    popup.document.write(receipt)
    popup.document.close()
    popup.print()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">POS Billing</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Search */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <label className="block text-gray-700 font-semibold mb-2">Search Product</label>
            <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
              <FiHash className="text-gray-500" />
              <input
                type="text"
                placeholder="Scan barcode or search..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="flex-1 bg-transparent outline-none"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-gray-800 mb-4">Products</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addItem(product)}
                  className="bg-gray-200 hover:bg-yellow-400 p-3 rounded-lg font-semibold transition-colors"
                >
                  <span className="block truncate">{product.name}</span>
                  <span className="block text-xs font-normal">₹{product.price}</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="col-span-full text-sm text-gray-500">No matching products</p>
              )}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Cart</h2>

          {/* Cart Items */}
          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {cartItems.length === 0 ? (
              <p className="text-gray-500 text-sm">No items in cart</p>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 border-b gap-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.quantity} x ₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-2 rounded bg-gray-100 hover:bg-gray-200">
                      <FiMinus />
                    </button>
                    <span className="w-6 text-center font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-2 rounded bg-gray-100 hover:bg-gray-200">
                      <FiPlus />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="p-2 rounded text-red-500 hover:bg-red-50">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t pt-4 mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (18%):</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span className="text-yellow-600">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Customer</label>
              <select
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Walk-in customer</option>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.user?.first_name} {item.user?.last_name} - {item.user?.phone || item.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
            <label className="block text-sm font-semibold mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePay}
            disabled={cartItems.length === 0 || loading}
            className="w-full bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Pay ₹${total.toFixed(2)}`}
          </button>
          <button
            onClick={() => printReceipt()}
            disabled={!lastInvoice}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            <FiPrinter /> Print Last Receipt
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Recent Invoices</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {invoices.map((invoice) => (
            <button
              key={invoice.id}
              onClick={() => printReceipt(invoice)}
              className="rounded-lg border border-gray-200 p-4 text-left hover:border-yellow-400 hover:bg-yellow-50"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-gray-900">{invoice.invoice_number}</p>
                <StatusBadge value={invoice.payment_method} tone="gray" />
              </div>
              <p className="mt-2 text-sm text-gray-500">{new Date(invoice.invoice_date).toLocaleString()}</p>
              <p className="mt-2 text-xl font-bold text-gray-900">₹{invoice.total_amount}</p>
            </button>
          ))}
          {!invoices.length && <p className="text-sm text-gray-500">No invoices yet</p>}
        </div>
      </div>
    </div>
  )
}

export default BillingPage
