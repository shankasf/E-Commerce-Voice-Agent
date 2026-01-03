'use client';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { VoiceWidget } from './VoiceWidget';

function VoiceWidgetWrapper() {
    const { user } = useAuth();
    const pathname = usePathname();

    // Don't show voice widget on the full chat-agent page (it has its own voice button)
    if (pathname?.includes('/dashboard/agent/chat-agent')) {
        return null;
    }

    // Only show voice widget when user is logged in
    if (!user) return null;

    return (
        <VoiceWidget
            apiEndpoint="/api/voice/webrtc"
            agentName="U Rack IT Support"
            primaryColor="#6366f1"
        />
    );
}

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <VoiceWidgetWrapper />
        </AuthProvider>
    );
}
