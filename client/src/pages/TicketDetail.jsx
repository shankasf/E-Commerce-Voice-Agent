import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import ChatBubble from '../components/ChatBubble';
import { ArrowLeft, Send, Loader2, User } from 'lucide-react';

const TicketDetail = () => {
    const { id } = useParams(); // Get ticket ID from URL
    const navigate = useNavigate();
    const scrollRef = useRef(null);

    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // 1. Fetch Ticket & Messages
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // In a real app, you might want a specific endpoint for 'GET /tickets/:id'
                // For now, we can fetch all and find one, OR (Better) we assume you build a GET /tickets/:id endpoint.
                // Let's assume we filter the list for now or just fetch messages if you haven't built GET single ticket.
                // NOTE: We will fetch messages directly.

                // Hack for MVP: We get the ticket info from the list (or you can add a route for it later)
                const tRes = await api.get('/tickets');
                const foundTicket = tRes.data.find(t => t.id === parseInt(id));
                setTicket(foundTicket);

                // B. Fetch Message History (The NEW part)
                const mRes = await api.get(`/tickets/${id}/messages`);
                setMessages(mRes.data);

                // Fetch Message History (We need to add this endpoint or just start empty)
                // Since we didn't build GET /messages explicitly, we rely on the interaction. 
                // BUT, to see history, we should add a GET route in the backend. 
                // For now, let's start with local state for the session if you prefer, 
                // OR we quickly add the GET route. 

                // Let's assume we start empty or fetch from a new endpoint.
                // For this step, let's assume empty history until we chat.

            } catch (err) {
                console.error("Error fetching ticket", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);





    // 3. Send Message (Talk to AI)
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const userMsg = newMessage;
        setNewMessage('');
        setSending(true);

        // Optimistic UI: Add user message immediately
        const tempMsg = { content: userMsg, sender_contact_id: 999, created_at: new Date() }; // 999 is dummy ID for "Me"
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await api.post(`/tickets/${id}/messages`, { content: userMsg });

            // The API returns { userMessage, aiResponse }
            // Add AI response to list
            if (res.data.aiResponse) {
                setMessages(prev => [...prev, {
                    content: res.data.aiResponse,
                    sender_agent_id: 1, // It's a bot
                    created_at: new Date()
                }]);
            }
        } catch (err) {
            console.error("Failed to send", err);
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!ticket) return <div>Ticket not found</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Navbar />

            {/* GAP FIX: Human Handoff Banner */}
            {ticket.requires_human_agent && (
                <div className="bg-indigo-600 text-white px-4 py-3 shadow-md flex items-center justify-center animate-pulse">
                    <User size={20} className="mr-2" />
                    <span className="font-bold">A Human Agent has been requested and will join shortly.</span>
                </div>
            )}

            {/* Header Area */}
            <div className="bg-white shadow-sm border-b px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                    <button onClick={() => navigate('/dashboard')} className="mr-4 text-gray-500 hover:text-gray-800">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-gray-800">#{ticket.id} - {ticket.subject}</h1>
                        <p className="text-xs text-gray-500">{ticket.device} • {ticket.status}</p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {ticket.priority}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10 text-sm">
                        <p>This is the start of your conversation.</p>
                        <p>Describe your issue to our AI Agent.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <ChatBubble
                            key={idx}
                            message={msg}
                            isUser={!!msg.sender_contact_id}
                        />
                    ))
                )}
                {sending && (
                    <div className="flex items-center text-xs text-gray-400 ml-4">
                        <Loader2 className="animate-spin mr-2" size={12} /> AI is thinking...
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 border-t">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TicketDetail;