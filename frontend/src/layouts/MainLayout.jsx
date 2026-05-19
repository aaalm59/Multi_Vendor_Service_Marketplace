import React, { useState } from 'react'
import { FiMenu, FiX } from 'react-icons/fi'
import { useDispatch } from 'react-redux'
import { toggleSidebar } from '../redux/store'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const MainLayout = ({ children }) => {
  const dispatch = useDispatch()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
    dispatch(toggleSidebar())
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onToggleSidebar={handleToggleSidebar} sidebarOpen={sidebarOpen} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
