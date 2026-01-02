'use client';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ReactNode } from 'react';
import { VoiceWidget } from './VoiceWidget';

function VoiceWidgetWrapper() {
    const { user } = useAuth();

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
