import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Server,
  Box,
  ScrollText,
  Activity,
  FileCode,
  Key,
  Bell,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pods', icon: Box, label: 'Pods' },
  { path: '/deployments', icon: Activity, label: 'Deployments' },
  { path: '/logs', icon: ScrollText, label: 'Logs' },
];

const configItems = [
  { path: '/configmaps', icon: FileCode, label: 'ConfigMaps' },
  { path: '/secrets', icon: Key, label: 'Secrets' },
];

const monitorItems = [
  { path: '/events', icon: AlertTriangle, label: 'Events' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/audit', icon: History, label: 'Audit Logs' },
];

const bottomItems = [
  { path: '/settings', icon: Settings, label: 'Settings' },
];

function NavItem({
  item,
  isCollapsed
}: {
  item: { path: string; icon: typeof LayoutDashboard; label: string };
  isCollapsed: boolean;
}) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative mx-2',
          isActive
            ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="activeNav"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-indigo-500 rounded-r-full shadow-lg shadow-primary/50"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <item.icon className={cn(
            'w-5 h-5 flex-shrink-0 transition-colors duration-200',
            isActive ? 'text-primary' : 'group-hover:text-primary'
          )} />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  );
}

function NavGroup({
  title,
  items,
  isCollapsed
}: {
  title: string;
  items: typeof navItems;
  isCollapsed: boolean;
}) {
  return (
    <div className="space-y-1">
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-2 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest"
          >
            {title}
          </motion.p>
        )}
      </AnimatePresence>
      {isCollapsed && <div className="h-2" />}
      {items.map((item) => (
        <NavItem key={item.path} item={item} isCollapsed={isCollapsed} />
      ))}
    </div>
  );
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full bg-gradient-to-b from-card to-card/95 border-r border-border/50 z-40 flex flex-col shadow-xl shadow-black/10"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border/50">
        <motion.div
          initial={false}
          animate={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
          className="flex items-center gap-3 w-full"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <Server className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <span className="font-bold text-foreground whitespace-nowrap">
                  K8s Portal
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Kubernetes Dashboard
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6">
        <NavGroup title="Overview" items={navItems} isCollapsed={isCollapsed} />

        <div className="px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <NavGroup title="Configuration" items={configItems} isCollapsed={isCollapsed} />

        <div className="px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <NavGroup title="Monitoring" items={monitorItems} isCollapsed={isCollapsed} />
      </nav>

      {/* Bottom Section */}
      <div className="py-3 border-t border-border/50">
        {bottomItems.map((item) => (
          <NavItem key={item.path} item={item} isCollapsed={isCollapsed} />
        ))}
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border-border/50 shadow-lg hover:bg-accent hover:scale-110 transition-all duration-200"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </Button>
    </motion.aside>
  );
}

export default Sidebar;
