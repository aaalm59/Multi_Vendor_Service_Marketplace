import React, { useEffect, useState } from 'react'
import { FiPlus, FiAlertTriangle } from 'react-icons/fi'
import { productAPI } from '../services/api'
import toast from 'react-hot-toast'

const InventoryPage = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await productAPI.getAll({ limit: 100 })
      setProducts(response.data.results || [])
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Inventory</h1>
        <button className="flex items-center space-x-2 bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-500">
          <FiPlus /> Add Product
        </button>
      </div>

      {/* Low Stock Alert */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
        <FiAlertTriangle className="text-red-600" size={24} />
        <div>
          <p className="font-semibold text-red-800">Low Stock Alert</p>
          <p className="text-sm text-red-700">You have 5 products with low stock levels</p>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-6 py-3 text-left">Product Name</th>
              <th className="px-6 py-3 text-left">SKU</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">Price</th>
              <th className="px-6 py-3 text-left">Stock</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">{product.name}</td>
                <td className="px-6 py-3">{product.SKU}</td>
                <td className="px-6 py-3">{product.category?.name}</td>
                <td className="px-6 py-3">₹{product.price}</td>
                <td className="px-6 py-3">{product.inventory?.quantity_on_hand || 0} units</td>
                <td className="px-6 py-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    product.inventory?.is_low_stock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {product.inventory?.is_low_stock ? 'Low' : 'OK'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className="text-center text-gray-500">Loading...</p>}
    </div>
  )
}

export default InventoryPage
