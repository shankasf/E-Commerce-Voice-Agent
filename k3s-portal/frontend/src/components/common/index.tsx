import { type ReactNode } from 'react';
import { Loader2, AlertCircle, Info, CheckCircle, XCircle, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import type { AlertSeverity } from '../../types';

// Loading Spinner
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <Loader2 className={clsx('animate-spin text-blue-500', sizeClasses[size])} />
    </div>
  );
}

// Card Component
interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  hoverable?: boolean;
}

export function Card({ children, className = '', title, subtitle, actions, hoverable = false }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white border border-gray-200 rounded-lg shadow-sm',
        hoverable && 'hover:shadow-md transition-shadow cursor-pointer',
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            {title && <h3 className="font-medium text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

// Metric Card
interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export function MetricCard({ icon: Icon, label, value, subtitle, trend, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className={clsx('p-4 rounded-lg border', colorClasses[color])}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {subtitle && <span className="text-sm text-gray-500 ml-2">{subtitle}</span>}
      </div>
      {trend && (
        <div className="mt-1 text-xs">
          <span className={trend.value >= 0 ? 'text-green-600' : 'text-red-600'}>
            {trend.value >= 0 ? '+' : ''}
            {trend.value}%
          </span>
          <span className="text-gray-400 ml-1">{trend.label}</span>
        </div>
      )}
    </div>
  );
}

// Status Badge
export interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info';
  label: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  };

  const statusClasses: Record<string, string> = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium border',
        sizeClasses[size],
        statusClasses[status]
      )}
    >
      {label}
    </span>
  );
}

// Alert Badge
interface AlertBadgeProps {
  severity: AlertSeverity;
  count?: number;
}

export function AlertBadge({ severity, count }: AlertBadgeProps) {
  const severityClasses: Record<AlertSeverity, string> = {
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };

  const icons: Record<AlertSeverity, ReactNode> = {
    info: <Info className="w-3 h-3" />,
    warning: <AlertCircle className="w-3 h-3" />,
    critical: <XCircle className="w-3 h-3" />,
  };

  return (
    <span
      className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', severityClasses[severity])}
    >
      {icons[severity]}
      {severity}
      {count !== undefined && <span className="ml-1">({count})</span>}
    </span>
  );
}

// Button
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  className?: string;
  type?: 'button' | 'submit';
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  className = '',
  type = 'button',
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 focus:ring-gray-400',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

// Empty State
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Info, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Confirm Dialog
export interface ConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const icons = {
    danger: <XCircle className="w-6 h-6 text-red-500" />,
    warning: <AlertCircle className="w-6 h-6 text-yellow-500" />,
    info: <CheckCircle className="w-6 h-6 text-blue-500" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white border border-gray-200 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">{icons[variant]}</div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Toast (simple notification)
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose?: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const typeClasses = {
    success: 'bg-green-100 border-green-200 text-green-800',
    error: 'bg-red-100 border-red-200 text-red-800',
    warning: 'bg-yellow-100 border-yellow-200 text-yellow-800',
    info: 'bg-blue-100 border-blue-200 text-blue-800',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  return (
    <div className={clsx('flex items-center gap-3 px-4 py-3 rounded-lg border', typeClasses[type])}>
      {icons[type]}
      <span className="text-sm">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-auto p-1 hover:bg-black/10 rounded">
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
