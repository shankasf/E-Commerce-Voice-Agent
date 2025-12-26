import { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/authcontext';

const useTicket = (ticketId) => {
    const { user } = useContext(AuthContext);
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!ticketId) return;
            try {
                setLoading(true);
                const [tRes, mRes] = await Promise.all([
                    api.get('/tickets'), // Ideally fetching single ticket /tickets/:id would be better but keeping consistency
                    api.get(`/tickets/${ticketId}/messages`)
                ]);

                const foundTicket = tRes.data.find(t => t.id === parseInt(ticketId));
                setTicket(foundTicket);
                setMessages(mRes.data);
            } catch (err) {
                console.error("Error fetching details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [ticketId]);

    const sendMessage = async (content) => {
        if (!content.trim()) return;

        setSending(true);
        // Optimistic update
        const tempMsg = { content: content, sender_contact_id: user?.id, created_at: new Date() };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await api.post(`/tickets/${ticketId}/messages`, { content: content });
            if (res.data.aiResponse) {
                setMessages(prev => [...prev, {
                    content: res.data.aiResponse,
                    sender_agent_id: 1,
                    created_at: new Date()
                }]);
            }
        } catch (err) {
            console.error("Failed to send", err);
            // Optionally revert optimistic update here
        } finally {
            setSending(false);
        }
    };

    const uploadFile = async (file) => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const imageUrl = res.data.url;
            await sendMessage(`![Image](${imageUrl})`);
        } catch (err) {
            console.error("Upload failed", err);
            throw err;
        } finally {
            setUploading(false);
        }
    };

    const closeTicket = async (resolution) => {
        try {
            // Optimistic update
            setTicket(prev => ({ ...prev, status: 'Closed' }));

            // System message
            const closeMsg = {
                content: `Ticket closed by user. Resolution: ${resolution || 'No resolution provided.'}`,
                sender_contact_id: user?.id,
                created_at: new Date()
            };
            setMessages(prev => [...prev, closeMsg]);

            await api.put(`/tickets/${ticketId}`, { status: 'Closed', resolution });
        } catch (err) {
            console.error("Failed to close ticket", err);
            // Revert?
        }
    };

    return {
        ticket,
        messages,
        loading,
        sending,
        uploading,
        sendMessage,
        uploadFile,
        closeTicket
    };
};

export default useTicket;
