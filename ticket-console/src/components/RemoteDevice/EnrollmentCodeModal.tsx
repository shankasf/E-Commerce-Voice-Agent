'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Download, Monitor, ExternalLink } from 'lucide-react';

interface EnrollmentCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollmentCode: string;
  deviceName: string;
}

export default function EnrollmentCodeModal({
  isOpen,
  onClose,
  enrollmentCode,
  deviceName,
}: EnrollmentCodeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(enrollmentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyInstructions = async () => {
    const downloadUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/tms/api/remote-agent/download`
      : '/tms/api/remote-agent/download';
    
    const instructions = `Remote Support Agent Setup Instructions

Device: ${deviceName}
Enrollment Code: ${enrollmentCode}

📥 DOWNLOAD LINK:
${downloadUrl}

📋 SETUP INSTRUCTIONS:

1. Download the Remote Support Agent
   - Click the download link above, or copy and paste it in your browser
   - The file will download as "RemoteSupportAgent.exe"

2. Run the installer
   - Double-click the downloaded "RemoteSupportAgent.exe" file
   - A window will open (no installation needed!)

3. Enter your enrollment code
   - Copy your enrollment code: ${enrollmentCode}
   - Paste it into the "Enrollment Code" field in the agent window
   - Click "Connect"

4. Wait for connection
   - The agent will connect automatically
   - Status will show "✅ Connected"
   - Keep the window open while receiving support

✅ BENEFITS:
• No Python installation needed
• No command-line usage required
• Works on Windows (Mac/Linux versions available on request)
• Simple and secure

⚠️ IMPORTANT:
• Keep the agent window open while IT support is helping you
• You can close it after your issue is resolved
• Share your enrollment code securely

If you encounter any issues, please contact your IT support team.`;

    try {
      await navigator.clipboard.writeText(instructions);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy instructions:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Monitor className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Device Enrollment</h2>
              <p className="text-sm text-gray-500">{deviceName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Enrollment Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enrollment Code
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg font-mono text-lg font-semibold text-center tracking-wider">
                {enrollmentCode}
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
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
              <h3 className="text-sm font-semibold text-blue-900">Easy Setup for Customer</h3>
            </div>
            <p className="text-sm text-blue-800 mb-3">
              Share this download link with the customer. No technical knowledge required!
            </p>
            <div className="bg-white border border-blue-200 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Download Link:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/tms/api/remote-agent/download`);
                    alert('Download link copied to clipboard!');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy Link
                </button>
              </div>
              <code className="text-xs text-gray-600 break-all block mt-2">
                {typeof window !== 'undefined' ? `${window.location.origin}/tms/api/remote-agent/download` : '/tms/api/remote-agent/download'}
              </code>
            </div>
            <a
              href="/tms/api/remote-agent/download"
              download="RemoteSupportAgent.exe"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              Test Download
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Customer Instructions</h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li><strong>Download</strong> the Remote Support Agent using the link above</li>
              <li><strong>Run</strong> the downloaded file (double-click RemoteSupportAgent.exe)</li>
              <li><strong>Enter enrollment code:</strong> Copy the code above and paste it in the agent window</li>
              <li><strong>Click "Connect"</strong> - The agent will connect automatically</li>
              <li><strong>Keep it running</strong> while you receive support</li>
            </ol>
            <p className="text-xs text-blue-700 mt-3 font-medium">
              ✅ No Python installation needed<br/>
              ✅ No command-line usage required<br/>
              ✅ Works on Windows (Mac/Linux versions available on request)
            </p>
          </div>

          {/* Quick Copy Instructions */}
          <div>
            <button
              onClick={handleCopyInstructions}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Copy Full Instructions
            </button>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Important:</strong> Share this code securely with the customer. The code is valid until the device is enrolled.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

