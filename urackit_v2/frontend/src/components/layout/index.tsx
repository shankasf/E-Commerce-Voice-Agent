import type { ReactNode } from 'react';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export function DashboardLayout({
    children,
    title,
    subtitle,
    onRefresh,
    isRefreshing,
}: DashboardLayoutProps) {
    const [dateRange, setDateRange] = useState('7d');

    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="ml-64 min-h-screen transition-all duration-300">
                <Header
                    title={title}
                    subtitle={subtitle}
                    onRefresh={onRefresh}
                    isRefreshing={isRefreshing}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                />
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}

export { Sidebar } from './Sidebar';
export { Header } from './Header';
