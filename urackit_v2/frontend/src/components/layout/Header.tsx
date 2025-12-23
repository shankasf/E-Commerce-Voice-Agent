import { useState } from 'react';
import { RefreshCw, Download, Loader2 } from 'lucide-react';

interface HeaderProps {
    title: string;
    subtitle: string;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    dateRange: string;
    onDateRangeChange: (range: string) => void;
}

export function Header({
    title,
    subtitle,
    onRefresh,
    isRefreshing,
    dateRange,
    onDateRangeChange,
}: HeaderProps) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            // Export functionality
            const data = { exported_at: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    return (
        <header className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800">
            <div className="flex items-center justify-between px-6 py-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">{title}</h1>
                    <p className="text-sm text-dark-400 mt-1">{subtitle}</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Date Range Selector */}
                    <select
                        value={dateRange}
                        onChange={(e) => onDateRangeChange(e.target.value)}
                        className="bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>

                    {/* Refresh Button */}
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 transition-colors disabled:opacity-50"
                    >
                        {isRefreshing ? (
                            <Loader2 className="w-5 h-5 text-dark-300 animate-spin" />
                        ) : (
                            <RefreshCw className="w-5 h-5 text-dark-300" />
                        )}
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>
        </header>
    );
}
