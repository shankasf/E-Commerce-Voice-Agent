'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, MoreVertical, Trash2, Shield, ShieldOff, Monitor, X, Download, ExternalLink } from 'lucide-react';
import { remoteDeviceAPI, RemoteDevice } from '@/lib/remoteDeviceAPI';
import DeviceStatusBadge from './DeviceStatusBadge';
import EnrollmentCodeModal from './EnrollmentCodeModal';

interface DeviceManagerProps {
  ticketId: number;
  orgId?: number;
}

export default function DeviceManager({ ticketId, orgId }: DeviceManagerProps) {
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<RemoteDevice | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Load devices
  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await remoteDeviceAPI.getDevices(ticketId);
      if (result.ok && result.devices) {
        setDevices(result.devices);
      } else {
        setError(result.error || 'Failed to load devices');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Initial load
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Auto-refresh device status every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadDevices();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadDevices]);

  // Handle create device
  const handleCreateDevice = async () => {
    if (!deviceName.trim()) {
      setError('Device name is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const result = await remoteDeviceAPI.createDevice(ticketId, deviceName.trim(), orgId);
      
      if (result.ok && result.device) {
        setDevices((prev) => [...prev, result.device!]);
        setDeviceName('');
        setShowCreateModal(false);
        setSelectedDevice(result.device);
        setShowEnrollmentModal(true);
      } else {
        setError(result.error || 'Failed to create device');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create device');
    } finally {
      setCreating(false);
    }
  };

  // Handle disable device
  const handleDisableDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to disable this device? This will prevent all remote access.')) {
      return;
    }

    try {
      const result = await remoteDeviceAPI.disableDevice(deviceId, 'Disabled by agent');
      if (result.ok) {
        await loadDevices();
      } else {
        setError(result.error || 'Failed to disable device');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to disable device');
    } finally {
      setMenuOpen(null);
    }
  };

  // Handle delete device
  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to permanently delete this device? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await remoteDeviceAPI.deleteDevice(deviceId);
      if (result.ok) {
        await loadDevices();
      } else {
        setError(result.error || 'Failed to delete device');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete device');
    } finally {
      setMenuOpen(null);
    }
  };

  // Handle show enrollment code
  const handleShowEnrollment = (device: RemoteDevice) => {
    if (device.enrollment_code) {
      setSelectedDevice(device);
      setShowEnrollmentModal(true);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Monitor className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Remote Devices</h3>
            <p className="text-sm text-gray-500">
              {devices.length} device{devices.length !== 1 ? 's' : ''} registered
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDevices}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Device List */}
      <div className="p-4">
        {loading && devices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p>Loading devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Monitor className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium mb-1">No devices registered</p>
            <p className="text-xs">Click "Add Device" to register a new remote device</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.device_id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {device.device_name}
                    </h4>
                    <DeviceStatusBadge
                      status={device.status}
                      connected={device.connected}
                      lastSeen={device.last_seen}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="font-mono">{device.device_id.substring(0, 20)}...</span>
                    {device.last_seen && (
                      <span>Last seen: {new Date(device.last_seen).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {device.status === 'pending' && device.enrollment_code && (
                    <>
                      <button
                        onClick={() => handleShowEnrollment(device)}
                        className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium"
                      >
                        Show Code
                      </button>
                      <a
                        href="/tms/api/remote-agent/download"
                        download="RemoteSupportAgent.exe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors font-medium flex items-center gap-1"
                        title="Download agent installer"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    </>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === device.device_id ? null : device.device_id)}
                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === device.device_id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                          {device.status === 'pending' && device.enrollment_code && (
                            <button
                              onClick={() => {
                                handleShowEnrollment(device);
                                setMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Monitor className="w-4 h-4" />
                              View Enrollment Code
                            </button>
                          )}
                          {device.status !== 'disabled' && (
                            <button
                              onClick={() => handleDisableDevice(device.device_id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <ShieldOff className="w-4 h-4" />
                              Disable Device
                            </button>
                          )}
                          {device.status === 'disabled' && (
                            <button
                              onClick={() => handleDeleteDevice(device.device_id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Device
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Device Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Remote Device</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setDeviceName('');
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g., John's Laptop"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateDevice();
                    }
                  }}
                  autoFocus
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setDeviceName('');
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDevice}
                disabled={creating || !deviceName.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Device'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Code Modal */}
      {showEnrollmentModal && selectedDevice && (
        <EnrollmentCodeModal
          isOpen={showEnrollmentModal}
          onClose={() => {
            setShowEnrollmentModal(false);
            setSelectedDevice(null);
          }}
          enrollmentCode={selectedDevice.enrollment_code || ''}
          deviceName={selectedDevice.device_name}
        />
      )}
    </div>
  );
}

