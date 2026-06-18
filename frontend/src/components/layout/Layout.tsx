import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { CalendarSync } from './CalendarSync';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export const Layout: React.FC = () => {
  const { direction } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  return (
    <div className={cn("min-h-screen bg-background", direction)}>
      <CalendarSync />
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - Desktop: always visible, Mobile: slide-in drawer */}
        <aside className={cn(
          "fixed lg:relative z-40 h-full transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:transform-none",
          direction === 'rtl' ? 'right-0' : 'left-0',
          sidebarOpen ? "translate-x-0" : direction === 'rtl' ? "translate-x-full" : "-translate-x-full",
          "w-64 flex-shrink-0"
        )}>
          <Sidebar />
        </aside>

        {/* Overlay for mobile when sidebar is open */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-in fade-in duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          
          {/* Page Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-muted/20 flex flex-col">
            <div className="flex-1">
              <Outlet />
            </div>
            <Footer />
          </main>
        </div>
      </div>
    </div>
  );
};