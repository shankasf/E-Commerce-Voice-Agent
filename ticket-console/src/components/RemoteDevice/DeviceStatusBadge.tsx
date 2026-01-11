'use client';

import React from 'react';
import { Wifi, WifiOff, Clock, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type DeviceStatus = 'pending' | 'active' | 'disabled';
type ConnectionStatus = 'connected' | 'disconnected';

interface DeviceStatusBadgeProps {
  status: DeviceStatus;
  connected: boolean;
  lastSeen?: string;
  showLastSeen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function DeviceStatusBadge({
  status,
  connected,
  lastSeen,
  showLastSeen = false,
  size = 'md',
}: DeviceStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  // Status badge colors
  const statusColors: Record<DeviceStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    active: 'bg-green-100 text-green-700 border-green-200',
    disabled: 'bg-red-100 text-red-700 border-red-200',
  };

  // Connection indicator colors
  const connectionColors = connected
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-gray-100 text-gray-600 border-gray-200';

  const getStatusLabel = () => {
    if (status === 'disabled') return 'Disabled';
    if (status === 'pending') return 'Pending';
    return connected ? 'Online' : 'Offline';
  };

  const getLastSeenText = () => {
    if (!lastSeen) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status Badge */}
      <span
        className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses[size]} ${statusColors[status]}`}
      >
        {status === 'disabled' && <XCircle className={iconSizes[size]} />}
        {status === 'pending' && <Clock className={iconSizes[size]} />}
        {status === 'active' && !connected && <WifiOff className={iconSizes[size]} />}
        {status === 'active' && connected && <Wifi className={iconSizes[size]} />}
        {getStatusLabel()}
      </span>

      {/* Connection Status Badge (only show if active) */}
      {status === 'active' && (
        <span
          className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses[size]} ${connectionColors}`}
        >
          {connected ? (
            <>
              <Wifi className={iconSizes[size]} />
              Connected
            </>
          ) : (
            <>
              <WifiOff className={iconSizes[size]} />
              Disconnected
            </>
          )}
        </span>
      )}

      {/* Last Seen (optional) */}
      {showLastSeen && status === 'active' && (
        <span className={`text-gray-500 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          Last seen: {getLastSeenText()}
        </span>
      )}
    </div>
  );
}

