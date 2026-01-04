import type { ReactNode } from 'react';
import clsx from 'clsx';
import {
    Phone,
    Clock,
    Activity,
    Ticket,
    Server,
    Users,
    CheckCircle,
    ArrowUp,
    TrendingUp,
    FolderOpen,
    Plus,
    Shield,
    DollarSign,
    Zap,
    Target,
    RefreshCw,
    UserPlus,
    Star,
    X,
    XCircle,
    TrendingDown,
    AlertTriangle,
    AlertCircle,
    Monitor,
    Cpu,
    Mail,
    Database,
    Eye,
    Lock,
} from 'lucide-react';

type IconName =
    | 'phone'
    | 'clock'
    | 'activity'
    | 'ticket'
    | 'server'
    | 'users'
    | 'check'
    | 'check-circle'
    | 'arrow-up'
    | 'trending'
    | 'folder-open'
    | 'plus'
    | 'shield'
    | 'dollar-sign'
    | 'zap'
    | 'target'
    | 'refresh'
    | 'repeat'
    | 'user-plus'
    | 'star'
    | 'x'
    | 'x-circle'
    | 'trending-down'
    | 'alert-triangle'
    | 'alert-circle'
    | 'monitor'
    | 'cpu'
    | 'mail'
    | 'database'
    | 'eye'
    | 'lock';

export type { IconName };

type ColorName = 'primary' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray';

const iconMap: Record<IconName, typeof Phone> = {
    phone: Phone,
    clock: Clock,
    activity: Activity,
    ticket: Ticket,
    server: Server,
    users: Users,
    check: CheckCircle,
    'check-circle': CheckCircle,
    'arrow-up': ArrowUp,
    trending: TrendingUp,
    'folder-open': FolderOpen,
    plus: Plus,
    shield: Shield,
    'dollar-sign': DollarSign,
    zap: Zap,
    target: Target,
    refresh: RefreshCw,
    repeat: RefreshCw,
    'user-plus': UserPlus,
    star: Star,
    x: X,
    'x-circle': XCircle,
    'trending-down': TrendingDown,
    'alert-triangle': AlertTriangle,
    'alert-circle': AlertCircle,
    monitor: Monitor,
    cpu: Cpu,
    mail: Mail,
    database: Database,
    eye: Eye,
    lock: Lock,
};

const colorClasses: Record<ColorName, { bg: string; text: string }> = {
    primary: { bg: 'bg-primary-600/20', text: 'text-primary-400' },
    blue: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
    green: { bg: 'bg-green-600/20', text: 'text-green-400' },
    yellow: { bg: 'bg-yellow-600/20', text: 'text-yellow-400' },
    orange: { bg: 'bg-orange-600/20', text: 'text-orange-400' },
    red: { bg: 'bg-red-600/20', text: 'text-red-400' },
    purple: { bg: 'bg-purple-600/20', text: 'text-purple-400' },
    gray: { bg: 'bg-dark-600/20', text: 'text-dark-400' },
};

interface MetricCardProps {
    label: string;
    value: string | number;
    icon: IconName;
    color?: ColorName;
}

export function MetricCard({ label, value, icon, color = 'primary' }: MetricCardProps) {
    const Icon = iconMap[icon] || Activity;
    const colors = colorClasses[color];

    return (
        <div className="glass rounded-xl p-3 md:p-4 metric-card">
            <div className="flex items-center gap-2 md:gap-3">
                <div
                    className={clsx(
                        'w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        colors.bg,
                        colors.text
                    )}
                >
                    <Icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-dark-400 text-xs md:text-sm truncate">{label}</p>
                    <p className="text-lg md:text-xl font-bold truncate">{value}</p>
                </div>
            </div>
        </div>
    );
}

interface StatCardProps {
    label: string;
    value: string | number;
    subtitle: string;
    color?: 'primary' | 'green' | 'yellow' | 'red';
}

export function StatCard({ label, value, subtitle, color = 'primary' }: StatCardProps) {
    const textColors = {
        primary: 'text-primary-400',
        green: 'text-green-400',
        yellow: 'text-yellow-400',
        red: 'text-red-400',
    };

    return (
        <div className="glass rounded-xl p-4 text-center overflow-hidden">
            <p className={clsx('text-2xl md:text-3xl font-bold truncate', textColors[color])}>
                {value}
            </p>
            <p className="font-medium mt-1 text-sm md:text-base truncate">{label}</p>
            <p className="text-xs md:text-sm text-dark-400 truncate">{subtitle}</p>
        </div>
    );
}

interface GaugeCardProps {
    title: string;
    value: number;
    max?: number;
    unit: string;
    color?: 'primary' | 'purple' | 'blue' | 'green' | 'yellow' | 'red';
    subtitle?: string;
}

export function GaugeCard({ title, value, max = 100, unit, color = 'primary', subtitle }: GaugeCardProps) {
    const bgColors = {
        primary: 'bg-primary-600',
        purple: 'bg-purple-600',
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        yellow: 'bg-yellow-600',
        red: 'bg-red-600',
    };

    const percent = Math.min((value / max) * 100, 100);

    return (
        <div className="glass rounded-xl p-3 md:p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2 md:mb-3 gap-2">
                <span className="font-medium text-sm md:text-base truncate">{title}</span>
                <span className="text-xs md:text-sm text-dark-400 flex-shrink-0">
                    {value}
                    {unit}
                </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2 md:h-3">
                <div
                    className={clsx('h-2 md:h-3 rounded-full transition-all duration-500', bgColors[color])}
                    style={{ width: `${percent}%` }}
                />
            </div>
            {subtitle && <p className="text-xs text-dark-400 mt-2 truncate">{subtitle}</p>}
        </div>
    );
}

export interface LatencyCardProps {
    label: string;
    value: number;
    unit?: string;
}

export function LatencyCard({ label, value, unit = 'ms' }: LatencyCardProps) {
    const getColor = (v: number) => {
        if (v < 100) return 'text-green-400';
        if (v < 300) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="glass rounded-xl p-3 md:p-4 text-center overflow-hidden">
            <p className={clsx('text-xl md:text-2xl font-bold', getColor(value))}>{value}{unit}</p>
            <p className="text-xs md:text-sm text-dark-400 mt-1 truncate">{label}</p>
        </div>
    );
}

interface CardProps {
    title?: string;
    children: ReactNode;
    className?: string;
    headerContent?: ReactNode;
}

export function Card({ title, children, className, headerContent }: CardProps) {
    return (
        <div className={clsx('glass rounded-2xl p-6', className)}>
            {(title || headerContent) && (
                <div className="flex items-center justify-between mb-4">
                    {title && <h3 className="text-lg font-semibold">{title}</h3>}
                    {headerContent}
                </div>
            )}
            {children}
        </div>
    );
}

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
    const sizes = {
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    return (
        <div className="flex items-center justify-center p-8">
            <div
                className={clsx(
                    sizes[size],
                    'border-4 border-primary-500 border-t-transparent rounded-full animate-spin'
                )}
            />
        </div>
    );
}

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-dark-400 gap-4">
            {icon}
            <p>{message}</p>
        </div>
    );
}

// Re-export persisted input components
export { PersistedInput, PersistedTextarea } from './PersistedInput';
