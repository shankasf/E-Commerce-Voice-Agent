'use client';

import { LucideIcon } from 'lucide-react';

export interface Tab<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface DashboardTabsProps<T extends string> {
  tabs: Tab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  /**
   * Theme color for active state (default: 'purple')
   */
  accentColor?: 'purple' | 'blue' | 'green' | 'indigo';
}

const accentColors = {
  purple: 'border-purple-600 text-purple-600',
  blue: 'border-blue-600 text-blue-600',
  green: 'border-green-600 text-green-600',
  indigo: 'border-indigo-600 text-indigo-600',
};

export function DashboardTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  accentColor = 'purple',
}: DashboardTabsProps<T>) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  isActive
                    ? accentColors[accentColor]
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
