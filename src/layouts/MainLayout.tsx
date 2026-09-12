import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const { toasts, removeToast } = useToast()

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* DESKTOP */}
      <div className="hidden min-h-[100dvh] w-full lg:flex">
        <Sidebar variant="desktop" />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onOpenSidebar={() => setSidebarOpen(true)}
            globalSearch={globalSearch}
            setGlobalSearch={setGlobalSearch}
          />

          <main className="min-w-0 flex-1 w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl animate-fade-in">
              <Outlet context={{ globalSearch }} />
            </div>
          </main>
        </div>
      </div>

      {/* MOBILE
          Sidebar is NOT part of this flex row.
          Sidebar.tsx portals its mobile drawer directly to body,
          so Android cannot place it inside the white/content area.
      */}
      <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col lg:hidden">
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
        />

        <main className="min-w-0 flex-1 w-full max-w-full overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6">
          <div className="mx-auto w-full max-w-full animate-fade-in">
            <Outlet context={{ globalSearch }} />
          </div>
        </main>
      </div>

      {/* MOBILE DRAWER — rendered separately from the page flow */}
      <Sidebar
        variant="mobile"
        open={sidebarOpen}
        onClose={closeSidebar}
      />

      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
      />
    </div>
  )
}
