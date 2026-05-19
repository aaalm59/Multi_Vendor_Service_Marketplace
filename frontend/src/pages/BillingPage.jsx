import React, { useState } from 'react'
import { FiPlus, FiSearch, FiBarcode } from 'react-icons/fi'

const BillingPage = () => {
  const [cartItems, setCartItems] = useState([])
  const [searchProduct, setSearchProduct] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.18
  const total = subtotal + tax

  const removeItem = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index))
  }

  const handlePay = () => {
    if (cartItems.length === 0) return
    // Payment logic here
    setCartItems([])
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
              <FiBarcode className="text-gray-500" />
              <input
                type="text"
                placeholder="Scan barcode or search..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="flex-1 bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Quick Add Buttons */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Add</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['LED Bulb', 'Wire', 'Switch', 'Fan Motor'].map((product) => (
                <button
                  key={product}
                  className="bg-gray-200 hover:bg-yellow-400 p-3 rounded-lg font-semibold transition-colors"
                >
                  + {product}
                </button>
              ))}
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
              cartItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 border-b">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.quantity} x ₹{item.price}</p>
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    ✕
                  </button>
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
          <div className="mb-4">
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

          {/* Pay Button */}
          <button
            onClick={handlePay}
            disabled={cartItems.length === 0}
            className="w-full bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            Pay ₹{total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BillingPage
