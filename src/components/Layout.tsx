import React from 'react'
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from '@/components/Footer';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div>
      <div className="min-h-screen bg-background flex relative">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
}
