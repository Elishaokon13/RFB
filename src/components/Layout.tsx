import React, { useState } from 'react'
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Layout() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - Hidden on mobile, shown on desktop */}
        <div className={`
          ${isMobile ? 'fixed inset-0 z-50 lg:hidden' : 'relative'}
          ${sidebarOpen ? 'block' : 'hidden lg:block'}
        `}>
          {isMobile && (
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div className={`
            ${isMobile ? 'fixed left-0 top-0 h-full w-64 z-50' : 'relative h-full'}
            bg-background border-r border-border
          `}>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="h-full w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
