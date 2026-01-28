import type { ReactElement } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ChevronRightIcon = () => (
  <svg className="w-3.5 h-3.5 text-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: () => ReactElement;
}

export function Header() {
  const { dbName, schema, table } = useParams();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Build breadcrumbs based on current location
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const crumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/', icon: HomeIcon }];

    if (dbName) {
      crumbs.push({ label: dbName, path: `/db/${dbName}` });
    }

    if (schema && table) {
      crumbs.push({
        label: `${schema}.${table}`,
        path: `/db/${dbName}/table/${schema}/${table}`,
      });
    }

    // Add page-specific breadcrumbs
    if (location.pathname.includes('/sql')) {
      crumbs.push({ label: 'SQL Editor', path: location.pathname });
    } else if (location.pathname.includes('/views')) {
      crumbs.push({ label: 'Views', path: location.pathname });
    } else if (location.pathname.includes('/functions')) {
      crumbs.push({ label: 'Functions', path: location.pathname });
    } else if (location.pathname.includes('/triggers')) {
      crumbs.push({ label: 'Triggers', path: location.pathname });
    } else if (location.pathname === '/performance') {
      crumbs.push({ label: 'Performance', path: '/performance' });
    } else if (location.pathname === '/backup') {
      crumbs.push({ label: 'Backup', path: '/backup' });
    } else if (location.pathname === '/users') {
      crumbs.push({ label: 'Users & Roles', path: '/users' });
    } else if (location.pathname === '/settings') {
      crumbs.push({ label: 'Settings', path: '/settings' });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-14 bg-panel/80 backdrop-blur-sm border-b border-panel-border flex items-center justify-between px-5">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRightIcon />}
            {index === breadcrumbs.length - 1 ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-text">
                {crumb.icon && <crumb.icon />}
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
              >
                {crumb.icon && <crumb.icon />}
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* User menu */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary border border-panel-border">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <UserIcon />
          </div>
          <span className="text-sm font-medium text-text">
            {user?.username || 'User'}
          </span>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          title="Sign out"
        >
          <LogoutIcon />
        </button>
      </div>
    </header>
  );
}
