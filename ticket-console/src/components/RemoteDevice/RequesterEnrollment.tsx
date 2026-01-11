'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, Key, Download, Copy, Check, AlertCircle, Wifi, WifiOff, Loader2, ExternalLink } from 'lucide-react';
import { remoteDeviceAPI, RemoteDevice } from '@/lib/remoteDeviceAPI';

interface RequesterEnrollmentProps {
  ticketId: number;
}

export default function RequesterEnrollment({ ticketId }: RequesterEnrollmentProps) {
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [enteringCode, setEnteringCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load devices for this ticket
  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true);
        const result = await remoteDeviceAPI.getDevices(ticketId);
        if (result.ok && result.devices) {
          setDevices(result.devices);
        }
      } catch (err: any) {
        console.error('Failed to load devices:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
    // Refresh every 10 seconds to check connection status
    const interval = setInterval(loadDevices, 10000);
    return () => clearInterval(interval);
  }, [ticketId]);

  // Find pending device (one that needs enrollment)
  const pendingDevice = devices.find(d => d.status === 'pending' && d.enrollment_code);
  const activeDevice = devices.find(d => d.status === 'active');

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEnterCode = async () => {
    if (!enrollmentCode.trim()) {
      setError('Please enter an enrollment code');
      return;
    }

    setEnteringCode(true);
    setError(null);

    // Note: The actual enrollment happens via the Python agent
    // This UI just shows instructions
    setEnteringCode(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading device information...</span>
        </div>
      </div>
    );
  }

  // If no devices, show nothing (agent hasn't created one yet)
  if (devices.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Monitor className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Remote Support Access</h3>
            <p className="text-sm text-gray-500">Allow IT support to diagnose your device remotely</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pending Device - Show Enrollment Code */}
        {pendingDevice && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Enrollment Code Received</h4>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                Pending
              </span>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Enrollment Code
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-white border-2 border-blue-300 rounded-lg font-mono text-lg font-semibold text-center tracking-wider">
                  {pendingDevice.enrollment_code}
                </div>
                <button
                  onClick={() => handleCopyCode(pendingDevice.enrollment_code!)}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Download Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-5 h-5 text-blue-600" />
                <h5 className="font-semibold text-gray-900">Easy Setup - One Click Installer</h5>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Download and run the installer. No technical knowledge required!
              </p>
              <a
                href="/tms/api/remote-agent/download"
                download="RemoteSupportAgent.exe"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                Download Remote Support Agent
              </a>
              <p className="text-xs text-gray-600 mt-2">
                Works on Windows. After downloading, double-click to run.
              </p>
            </div>

            <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4">
              <h5 className="font-semibold text-gray-900 mb-2">Simple Steps:</h5>
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>
                  <strong>Download</strong> the Remote Support Agent (button above)
                </li>
                <li>
                  <strong>Run</strong> the downloaded file (double-click)
                </li>
                <li>
                  <strong>Enter enrollment code:</strong> Copy the code above and paste it in the agent window
                </li>
                <li>
                  <strong>Click "Connect"</strong> - The agent will connect automatically
                </li>
                <li>
                  <strong>Keep it running</strong> while IT support helps you
                </li>
              </ol>
            </div>

            <div className="flex items-start gap-2 text-sm text-blue-800 bg-blue-100 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Important:</strong> Keep the agent running while IT support is helping you. 
                You can close it after your issue is resolved.
              </p>
            </div>
          </div>
        )}

        {/* Active Device - Show Connection Status */}
        {activeDevice && (
          <div className={`border rounded-lg p-4 ${
            activeDevice.connected 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {activeDevice.connected ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-gray-400" />
                )}
                <h4 className="font-semibold text-gray-900">{activeDevice.device_name}</h4>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                activeDevice.connected
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {activeDevice.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {activeDevice.connected ? (
              <p className="text-sm text-green-700">
                ✓ Your device is connected. IT support can now run diagnostics remotely.
              </p>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Your device is not connected. Please download and run the agent:
                </p>
                <a
                  href="/tms/api/remote-agent/download"
                  download="RemoteSupportAgent.exe"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm mb-2"
                >
                  <Download className="w-4 h-4" />
                  Download Agent
                </a>
                <p className="text-xs text-gray-500">
                  After downloading, run the file and click "Start Connection"
                </p>
              </div>
            )}
            {activeDevice.last_seen && (
              <p className="text-xs text-gray-500 mt-2">
                Last seen: {new Date(activeDevice.last_seen).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Manual Code Entry (if agent shared code via message) */}
        {!pendingDevice && !activeDevice && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Have an Enrollment Code?</h4>
            <p className="text-sm text-gray-600 mb-3">
              If IT support shared an enrollment code with you:
            </p>
            
            {/* Download Link */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">First, download the agent:</p>
              <a
                href="/tms/api/remote-agent/download"
                download="RemoteSupportAgent.exe"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                Download Remote Support Agent
              </a>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              Then run it and enter your enrollment code in the agent window.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

