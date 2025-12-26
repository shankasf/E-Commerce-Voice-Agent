import { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Monitor, Loader2, User, CheckCircle2 } from 'lucide-react';
import { AuthContext } from '../context/authcontext';
import useTicket from '../hooks/useTicket';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import TicketSidebar from '../components/TicketSidebar';

const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    // Custom Hook handles data & logic
    const {
        ticket, messages, loading, sending, uploading,
        sendMessage, uploadFile, closeTicket
    } = useTicket(id);

    const [newMessage, setNewMessage] = useState('');
    const [showSidebar, setShowSidebar] = useState(true);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [resolutionNote, setResolutionNote] = useState('');

    const handleSend = async (e) => {
        e && e.preventDefault();
        await sendMessage(newMessage);
        setNewMessage('');
    };

    const handleFileUpload = async (e) => {
        await uploadFile(e.target.files[0]);
    };

    const handleSubmitClose = async () => {
        await closeTicket(resolutionNote);
        setIsCloseModalOpen(false);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
    );

    if (!ticket) return <div>Ticket not found</div>;

    return (
        <div className="flex flex-col h-screen bg-[#F8FAFC] relative">
            {/* Close Ticket Modal */}
            {isCloseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Close Ticket?</h3>
                            <p className="text-gray-500 text-sm mb-4">
                                Are you sure you want to close this ticket?
                            </p>
                            <textarea
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32"
                                placeholder="Resolution note (optional)..."
                                value={resolutionNote}
                                onChange={(e) => setResolutionNote(e.target.value)}
                            />
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setIsCloseModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={handleSubmitClose} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2">
                                <CheckCircle2 size={16} /> Confirm Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="font-bold text-xl text-gray-900">#{ticket.id}</h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ticket.status === 'Open' ? 'bg-green-100 text-green-700' : ticket.status === 'Closed' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                {ticket.status}
                            </span>
                        </div>
                        <h2 className="text-sm text-gray-500 font-medium truncate max-w-md">{ticket.subject}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                        <Monitor size={14} /> <span>{ticket.device || 'Unknown Device'}</span>
                    </div>
                    <button onClick={() => setShowSidebar(!showSidebar)} className={`p-2 rounded-lg ${showSidebar ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}>
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col relative bg-slate-50">
                    {/* Handoff Banner */}
                    {ticket.requires_human_agent && (
                        <div className="absolute top-4 left-4 right-4 z-20 mx-auto max-w-2xl">
                            <div className="bg-indigo-600/95 backdrop-blur text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <User size={18} /> <span className="font-medium text-sm">Human agent requested...</span>
                                </div>
                                <Loader2 size={16} className="animate-spin opacity-70" />
                            </div>
                        </div>
                    )}

                    <ChatWindow ticket={ticket} messages={messages} sending={sending} />

                    <ChatInput
                        newMessage={newMessage}
                        setNewMessage={setNewMessage}
                        handleSend={handleSend}
                        sending={sending}
                        uploading={uploading}
                        handleFileUpload={handleFileUpload}
                        isClosed={ticket.status === 'Closed'}
                    />
                </div>

                {showSidebar && (
                    <TicketSidebar
                        ticket={ticket}
                        user={user}
                        handleEscalate={() => sendMessage("Request for human agent")}
                        setIsCloseModalOpen={setIsCloseModalOpen}
                    />
                )}
            </div>
        </div>
    );
};

export default TicketDetail;