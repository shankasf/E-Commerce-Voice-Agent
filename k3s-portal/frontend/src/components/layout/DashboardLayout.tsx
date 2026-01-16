import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  children?: ReactNode;
  title?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DashboardLayout({ children, title, onRefresh, isRefreshing }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      <motion.div
        initial={false}
        animate={{ marginLeft: isSidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="min-h-screen flex flex-col overflow-x-hidden"
      >
        <Header title={title} onRefresh={onRefresh} isRefreshing={isRefreshing} />

        <main className="flex-1 p-6 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-full"
          >
            {children || <Outlet />}
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
}

export default DashboardLayout;
